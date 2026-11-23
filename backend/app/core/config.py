from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_env: str = "development"
    api_host: str = "http://localhost:8000"
    # Comma-separated so the storefront and admin (separate domains) can both call the API.
    frontend_origin: str = "http://localhost:5173,http://localhost:5174"

    database_url: str
    supabase_url: str
    supabase_jwt_audience: str = "authenticated"
    supabase_jwks_url: str
    supabase_jwt_secret: str | None = None

    default_store_slug: str = "groovydudz"

    resend_api_key: str | None = None
    resend_from_email: str = "GroovyDudz <orders@groovydudz.com>"

    # Public storefront URL; PayU sends the shopper back here after payment.
    storefront_url: str = "http://localhost:5173"

    # PayU India hosted checkout. payu_env is "test" (sandbox) or "production".
    payu_env: str = "test"
    payu_merchant_key: str | None = None
    payu_merchant_salt: str | None = None
    # OAuth client for PayU's newer APIs (refunds, settlements); hosted checkout doesn't need it.
    payu_client_id: str | None = None
    payu_client_secret: str | None = None

    # Delhivery B2C API. Staging: https://staging-express.delhivery.com
    delhivery_base_url: str = "https://track.delhivery.com"
    delhivery_api_token: str | None = None
    # Warehouse name exactly as registered in Delhivery One (Settings → Pickup locations).
    delhivery_pickup_location: str | None = None
    delhivery_shipping_mode: str = "Surface"  # or "Express"
    delhivery_default_weight_grams: int = 500
    delhivery_seller_name: str = "GroovyDudz"
    delhivery_seller_gst_tin: str | None = None

    aws_region: str = "ap-south-1"
    aws_s3_bucket: str | None = None
    aws_cloudfront_url: str | None = None

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip().rstrip("/") for origin in self.frontend_origin.split(",") if origin.strip()]

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
