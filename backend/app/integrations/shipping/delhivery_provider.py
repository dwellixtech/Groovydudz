"""Delhivery B2C API client (https://one.delhivery.com/developer-portal).

Auth is a single API token sent as `Authorization: Token <token>`. Shipments are created against a
pickup location (warehouse) that must already be registered in Delhivery One.
"""

import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

import httpx

from app.core.config import settings
from app.integrations.base.provider import ProviderInfo

TRACKING_PAGE = "https://www.delhivery.com/track-v2/package/{awb}"
IST = timezone(timedelta(hours=5, minutes=30))

# Delhivery Status.Status text -> our fulfillment status.
STATUS_MAP = {
    "manifested": "manifested",
    "not picked": "manifested",
    "open": "manifested",
    "scheduled": "manifested",
    "picked up": "picked_up",
    "in transit": "in_transit",
    "pending": "in_transit",
    "dispatched": "out_for_delivery",
    "delivered": "delivered",
    "rto": "returned",
    "returned": "returned",
    "cancelled": "cancelled",
    "canceled": "cancelled",
}


class DelhiveryError(Exception):
    pass


def _digits(value: str | None, keep: int = 10) -> str:
    return "".join(c for c in (value or "") if c.isdigit())[-keep:]


def _error_text(payload: Any) -> str:
    if isinstance(payload, dict):
        packages = payload.get("packages")
        if isinstance(packages, list) and packages and packages[0].get("remarks"):
            return "; ".join(str(r) for r in packages[0]["remarks"])
        for key in ("rmk", "error", "detail", "message", "remarks"):
            if payload.get(key):
                return str(payload[key])
    return str(payload)[:500]


class DelhiveryShippingProvider:
    info = ProviderInfo(key="delhivery", kind="shipping", display_name="Delhivery")

    def __init__(self, pickup_location: str | None = None):
        self.base_url = settings.delhivery_base_url.rstrip("/")
        self.token = settings.delhivery_api_token
        # Set in Admin → Integrations (stored on the store), falling back to the env var.
        self.pickup_location = pickup_location or settings.delhivery_pickup_location

    @property
    def is_configured(self) -> bool:
        return bool(self.token)

    @property
    def can_ship(self) -> bool:
        """Creating shipments additionally needs the registered pickup warehouse name."""
        return bool(self.token and self.pickup_location)

    @staticmethod
    def tracking_url(awb: str) -> str:
        return TRACKING_PAGE.format(awb=awb)

    async def _request(self, method: str, path: str, **kwargs: Any) -> Any:
        if not self.token:
            raise DelhiveryError("Delhivery is not configured")
        headers = {"Authorization": f"Token {self.token}", "Accept": "application/json"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(method, f"{self.base_url}{path}", headers=headers, **kwargs)
        try:
            payload = response.json()
        except ValueError:
            payload = {"message": response.text[:500]}
        if response.status_code >= 400:
            raise DelhiveryError(f"Delhivery {path} failed ({response.status_code}): {_error_text(payload)}")
        return payload

    async def check_serviceability(self, postal_code: str) -> dict:
        payload = await self._request("GET", "/c/api/pin-codes/json/", params={"filter_codes": postal_code})
        codes = payload.get("delivery_codes") or []
        info = codes[0].get("postal_code", {}) if codes else {}
        embargo = "embargo" in str(info.get("remarks", "")).lower()
        serviceable = bool(info) and info.get("pre_paid") == "Y" and not embargo
        return {
            "postal_code": postal_code,
            "serviceable": serviceable,
            "message": None if serviceable else f"Sorry, we can't deliver to PIN code {postal_code} yet.",
            "raw": info,
        }

    async def create_shipment(
        self,
        *,
        reference: str,
        consignee: dict[str, Any],
        declared_value: Decimal,
        weight_grams: int,
        quantity: int,
        item_description: str,
    ) -> dict:
        if not self.can_ship:
            raise DelhiveryError("Set the Delhivery pickup location in Admin → Integrations")
        address = ", ".join(p for p in (consignee.get("line1"), consignee.get("line2")) if p)
        shipment = {
            "name": consignee.get("name", ""),
            "add": address,
            "pin": consignee.get("postal_code", ""),
            "city": consignee.get("city", ""),
            "state": consignee.get("state", ""),
            "country": "India",
            "phone": _digits(consignee.get("phone")),
            "order": reference,
            "payment_mode": "Prepaid",
            "products_desc": item_description[:200],
            "total_amount": f"{declared_value:.2f}",
            "cod_amount": "0",
            "quantity": str(quantity),
            "weight": str(weight_grams),
            "shipping_mode": settings.delhivery_shipping_mode,
            "seller_name": settings.delhivery_seller_name,
            "seller_inv": reference,
        }
        if settings.delhivery_seller_gst_tin:
            shipment["seller_gst_tin"] = settings.delhivery_seller_gst_tin
        body = {"shipments": [shipment], "pickup_location": {"name": self.pickup_location}}
        # The manifest API takes a form-encoded body with a JSON string under "data".
        payload = await self._request(
            "POST", "/api/cmu/create.json", data={"format": "json", "data": json.dumps(body)}
        )
        packages = payload.get("packages") or []
        package = packages[0] if packages else {}
        awb = package.get("waybill")
        if not payload.get("success", True) or package.get("status") != "Success" or not awb:
            raise DelhiveryError(f"Delhivery rejected the shipment: {_error_text(payload)}")
        return {"awb": str(awb), "raw": payload}

    async def request_pickup(self, package_count: int = 1) -> dict:
        """Ask Delhivery to collect from the warehouse on the next working day at 14:00."""
        day = datetime.now(IST).date() + timedelta(days=1)
        if day.weekday() == 6:
            day += timedelta(days=1)
        return await self._request(
            "POST",
            "/fm/request/new/",
            json={
                "pickup_location": self.pickup_location,
                "pickup_date": day.isoformat(),
                "pickup_time": "14:00:00",
                "expected_package_count": package_count,
            },
        )

    async def label_pdf(self, awb: str) -> bytes:
        payload = await self._request("GET", "/api/p/packing_slip", params={"wbns": awb, "pdf": "true"})
        packages = payload.get("packages") or []
        link = packages[0].get("pdf_download_link") if packages else None
        if not link:
            raise DelhiveryError(f"Delhivery returned no label for {awb}: {_error_text(payload)}")
        async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
            response = await client.get(link)
            response.raise_for_status()
            return response.content

    async def cancel(self, awb: str) -> dict:
        payload = await self._request("POST", "/api/p/edit", json={"waybill": awb, "cancellation": "true"})
        if payload.get("status") is False or payload.get("error"):
            raise DelhiveryError(f"Delhivery could not cancel {awb}: {_error_text(payload)}")
        return payload

    async def track(self, awb: str) -> dict:
        payload = await self._request("GET", "/api/v1/packages/json/", params={"waybill": awb})
        data = payload.get("ShipmentData") or []
        shipment = data[0].get("Shipment", {}) if data else {}
        status = shipment.get("Status") or {}
        return {
            "awb": awb,
            "status": status.get("Status"),
            "status_type": status.get("StatusType"),
            "status_date": status.get("StatusDateTime"),
            "raw": shipment or payload,
        }
