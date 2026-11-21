"""PayU India hosted checkout (https://docs.payu.in).

Flow: the backend signs a payment request, the browser POSTs it to PayU's hosted page, and PayU
POSTs the result back to our surl/furl. Every response is checked with the reverse hash and then
re-confirmed server-to-server with the verify_payment API before an order is marked paid.
"""

import hashlib
from decimal import Decimal
from hmac import compare_digest

import httpx

from app.core.config import settings
from app.integrations.base.provider import ProviderInfo

PAYU_URLS = {
    "test": {
        "payment": "https://test.payu.in/_payment",
        "postservice": "https://test.payu.in/merchant/postservice?form=2",
    },
    "production": {
        "payment": "https://secure.payu.in/_payment",
        "postservice": "https://info.payu.in/merchant/postservice?form=2",
    },
}

UDF_FIELDS = ("udf1", "udf2", "udf3", "udf4", "udf5")


def _sha512(value: str) -> str:
    return hashlib.sha512(value.encode()).hexdigest()


def clean_field(value: str, limit: int = 100) -> str:
    # "|" is PayU's hash separator, so it must never appear inside a hashed field.
    return " ".join(value.replace("|", " ").split())[:limit]


class PayUPaymentProvider:
    info = ProviderInfo(key="payu", kind="payment", display_name="PayU")

    def __init__(self, merchant_key: str | None, merchant_salt: str | None, env: str = "test"):
        self.merchant_key = merchant_key
        self.merchant_salt = merchant_salt
        self.urls = PAYU_URLS["production" if env == "production" else "test"]

    @classmethod
    def from_settings(cls) -> "PayUPaymentProvider":
        return cls(settings.payu_merchant_key, settings.payu_merchant_salt, settings.payu_env)

    @property
    def is_configured(self) -> bool:
        return bool(self.merchant_key and self.merchant_salt)

    @property
    def payment_url(self) -> str:
        return self.urls["payment"]

    def build_payment_request(
        self,
        *,
        txnid: str,
        amount: Decimal,
        productinfo: str,
        firstname: str,
        email: str,
        phone: str,
        surl: str,
        furl: str,
        udf1: str = "",
    ) -> dict[str, str]:
        """Return the form fields the browser must POST to `payment_url`."""
        params = {
            "key": self.merchant_key or "",
            "txnid": txnid,
            "amount": f"{amount:.2f}",
            "productinfo": clean_field(productinfo),
            "firstname": clean_field(firstname, 60),
            "email": clean_field(email),
            "phone": clean_field(phone, 20),
            "surl": surl,
            "furl": furl,
            "udf1": clean_field(udf1),
            "udf2": "",
            "udf3": "",
            "udf4": "",
            "udf5": "",
        }
        # key|txnid|amount|productinfo|firstname|email|udf1..udf5||||||SALT
        hash_fields = [params[k] for k in ("key", "txnid", "amount", "productinfo", "firstname", "email")]
        hash_fields += [params[k] for k in UDF_FIELDS]
        hash_fields += ["", "", "", "", "", self.merchant_salt or ""]
        params["hash"] = _sha512("|".join(hash_fields))
        return params

    def verify_response_hash(self, data: dict[str, str]) -> bool:
        """Check the reverse hash PayU sends on surl/furl redirects and webhooks."""
        if not self.merchant_salt or not data.get("hash"):
            return False
        # SALT|status||||||udf5|udf4|udf3|udf2|udf1|email|firstname|productinfo|amount|txnid|key
        fields = [self.merchant_salt, data.get("status", ""), "", "", "", "", ""]
        fields += [data.get(k, "") for k in reversed(UDF_FIELDS)]
        fields += [data.get(k, "") for k in ("email", "firstname", "productinfo", "amount", "txnid", "key")]
        if data.get("additionalCharges"):
            fields.insert(0, data["additionalCharges"])
        expected = _sha512("|".join(fields))
        return compare_digest(expected, data["hash"].lower())

    async def verify_payment(self, txnid: str) -> dict:
        """Ask PayU directly for the transaction state; never trust the browser redirect alone."""
        command = "verify_payment"
        form = {
            "key": self.merchant_key or "",
            "command": command,
            "var1": txnid,
            "hash": _sha512(f"{self.merchant_key}|{command}|{txnid}|{self.merchant_salt}"),
        }
        async with httpx.AsyncClient(timeout=20) as client:
            response = await client.post(self.urls["postservice"], data=form)
            response.raise_for_status()
            body = response.json()
        details = (body.get("transaction_details") or {}).get(txnid)
        return details if isinstance(details, dict) else {"status": "not_found", "raw": body}
