import uuid
from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.models import Fulfillment, Order, ProductVariant, Store, StoreIntegration
from app.integrations.shipping.delhivery_provider import (
    STATUS_MAP,
    DelhiveryError,
    DelhiveryShippingProvider,
)

PROVIDER_KEY = "delhivery"
ACTIVE_STATUSES = {"manifested", "picked_up", "in_transit", "out_for_delivery", "delivered"}


async def delhivery_settings(db: AsyncSession, store: Store) -> dict:
    result = await db.execute(
        select(StoreIntegration).where(
            StoreIntegration.store_id == store.id, StoreIntegration.provider_key == PROVIDER_KEY
        )
    )
    integration = result.scalar_one_or_none()
    return dict(integration.config) if integration else {}


def _provider(pickup_location: str | None = None, require_pickup: bool = False) -> DelhiveryShippingProvider:
    provider = DelhiveryShippingProvider(pickup_location)
    if not provider.is_configured:
        raise HTTPException(status_code=503, detail="Delhivery is not configured (DELHIVERY_API_TOKEN)")
    if require_pickup and not provider.can_ship:
        raise HTTPException(
            status_code=400,
            detail="Add your Delhivery pickup location in Admin → Integrations before shipping",
        )
    return provider


async def _shipping_provider(db: AsyncSession, store: Store) -> DelhiveryShippingProvider:
    config = await delhivery_settings(db, store)
    return _provider(config.get("pickup_location"), require_pickup=True)


async def check_serviceability(postal_code: str) -> dict:
    if not (len(postal_code) == 6 and postal_code.isdigit()):
        raise HTTPException(status_code=400, detail="Enter a 6-digit PIN code")
    try:
        return await _provider().check_serviceability(postal_code)
    except DelhiveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc


async def _load_order(db: AsyncSession, store: Store, order_id: uuid.UUID) -> Order:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.fulfillments))
        .where(Order.id == order_id, Order.store_id == store.id)
        .execution_options(populate_existing=True)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    return order


async def _load_fulfillment(db: AsyncSession, store: Store, fulfillment_id: uuid.UUID) -> Fulfillment:
    result = await db.execute(
        select(Fulfillment)
        .join(Order, Order.id == Fulfillment.order_id)
        .where(Fulfillment.id == fulfillment_id, Order.store_id == store.id)
    )
    fulfillment = result.scalar_one_or_none()
    if fulfillment is None:
        raise HTTPException(status_code=404, detail="Shipment not found")
    if fulfillment.provider != PROVIDER_KEY or not fulfillment.tracking_number:
        raise HTTPException(status_code=400, detail="Not a Delhivery shipment")
    return fulfillment


async def _order_weight_grams(db: AsyncSession, order: Order) -> int:
    grams = 0
    for line in order.lines:
        variant = await db.get(ProductVariant, line.variant_id) if line.variant_id else None
        if variant and variant.weight_grams:
            grams += variant.weight_grams * line.quantity
    return grams or settings.delhivery_default_weight_grams


async def create_shipment(db: AsyncSession, store: Store, order_id: uuid.UUID) -> Order:
    provider = await _shipping_provider(db, store)
    order = await _load_order(db, store, order_id)
    if order.payment_status != "paid":
        raise HTTPException(status_code=400, detail="Only paid orders can be shipped")
    if any(f.provider == PROVIDER_KEY and f.status in ACTIVE_STATUSES for f in order.fulfillments):
        raise HTTPException(status_code=409, detail="This order already has an active Delhivery shipment")

    try:
        result = await provider.create_shipment(
            reference=order.order_number,
            consignee=order.shipping_address,
            declared_value=Decimal(order.grand_total),
            weight_grams=await _order_weight_grams(db, order),
            quantity=sum(line.quantity for line in order.lines) or 1,
            item_description=", ".join(line.title for line in order.lines) or "Party decorations",
        )
    except DelhiveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    # A pickup request failing (e.g. one already booked for tomorrow) must not lose the AWB.
    try:
        pickup = await provider.request_pickup()
    except DelhiveryError as exc:
        pickup = {"error": str(exc)}

    db.add(
        Fulfillment(
            id=uuid.uuid4(),
            order_id=order.id,
            provider=PROVIDER_KEY,
            status="manifested",
            tracking_number=result["awb"],
            tracking_url=provider.tracking_url(result["awb"]),
            label_url=None,
            raw_payload={"manifest": result["raw"], "pickup": pickup},
        )
    )
    order.fulfillment_status = "fulfilled"
    await db.commit()
    return await _load_order(db, store, order.id)


async def shipment_label(db: AsyncSession, store: Store, fulfillment_id: uuid.UUID) -> tuple[str, bytes]:
    fulfillment = await _load_fulfillment(db, store, fulfillment_id)
    try:
        pdf = await _provider().label_pdf(fulfillment.tracking_number or "")
    except DelhiveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    return f"delhivery-{fulfillment.tracking_number}.pdf", pdf


async def refresh_tracking(db: AsyncSession, store: Store, fulfillment_id: uuid.UUID) -> Fulfillment:
    fulfillment = await _load_fulfillment(db, store, fulfillment_id)
    try:
        tracking = await _provider().track(fulfillment.tracking_number or "")
    except DelhiveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    status_text = str(tracking.get("status") or "").lower()
    fulfillment.status = STATUS_MAP.get(status_text, fulfillment.status)
    fulfillment.raw_payload = {**fulfillment.raw_payload, "tracking": tracking["raw"]}
    await db.commit()
    await db.refresh(fulfillment)
    return fulfillment


async def cancel_shipment(db: AsyncSession, store: Store, fulfillment_id: uuid.UUID) -> Fulfillment:
    fulfillment = await _load_fulfillment(db, store, fulfillment_id)
    if fulfillment.status != "manifested":
        raise HTTPException(status_code=400, detail="Only shipments not yet picked up can be cancelled")
    try:
        result = await _provider().cancel(fulfillment.tracking_number or "")
    except DelhiveryError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    fulfillment.status = "cancelled"
    fulfillment.raw_payload = {**fulfillment.raw_payload, "cancel": result}
    order = await db.get(Order, fulfillment.order_id)
    if order:
        order.fulfillment_status = "unfulfilled"
    await db.commit()
    await db.refresh(fulfillment)
    return fulfillment


async def save_delhivery_settings(db: AsyncSession, store: Store, pickup_location: str) -> dict:
    result = await db.execute(
        select(StoreIntegration).where(
            StoreIntegration.store_id == store.id, StoreIntegration.provider_key == PROVIDER_KEY
        )
    )
    integration = result.scalar_one_or_none()
    if integration is None:
        integration = StoreIntegration(
            id=uuid.uuid4(),
            store_id=store.id,
            provider_key=PROVIDER_KEY,
            kind="shipping",
            status="active",
            config={},
            secret_ref=None,
        )
        db.add(integration)
    integration.config = {**(integration.config or {}), "pickup_location": pickup_location.strip()}
    await db.commit()
    return dict(integration.config)
