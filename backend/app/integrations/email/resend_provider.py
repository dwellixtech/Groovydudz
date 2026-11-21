import resend

from app.core.config import settings
from app.integrations.base.provider import ProviderInfo


class ResendEmailProvider:
    info = ProviderInfo(key="resend", kind="email", display_name="Resend")

    def __init__(self, api_key: str | None, from_email: str):
        self.api_key = api_key
        self.from_email = from_email

    @classmethod
    def from_settings(cls) -> "ResendEmailProvider":
        return cls(settings.resend_api_key, settings.resend_from_email)

    @property
    def is_configured(self) -> bool:
        return bool(self.api_key)

    def send_order_confirmation(self, to_email: str, order_number: str, amount: str) -> dict:
        if not self.is_configured:
            return {"status": "skipped", "reason": "resend_not_configured"}
        resend.api_key = self.api_key
        return resend.Emails.send(
            {
                "from": self.from_email,
                "to": [to_email],
                "subject": f"Your GroovyDudz order {order_number}",
                "html": (
                    f"<h1>Thanks for your order</h1>"
                    f"<p>Order <strong>{order_number}</strong> total is INR {amount}.</p>"
                ),
            }
        )
