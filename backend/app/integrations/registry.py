from app.integrations.email.resend_provider import ResendEmailProvider
from app.integrations.payment.payu_provider import PayUPaymentProvider
from app.integrations.shipping.delhivery_provider import DelhiveryShippingProvider


def available_providers() -> list[dict]:
    providers = [
        ResendEmailProvider.from_settings(),
        PayUPaymentProvider.from_settings(),
        DelhiveryShippingProvider(),
    ]
    return [
        {
            "key": provider.info.key,
            "kind": provider.info.kind,
            "display_name": provider.info.display_name,
            "configured": provider.is_configured,
        }
        for provider in providers
    ]
