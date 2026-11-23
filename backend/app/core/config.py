import re
from functools import lru_cache
from urllib.parse import quote, urlsplit, urlunsplit

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


def _first_non_blank(*values: str | None) -> str:
    return next((value.strip() for value in values if value and value.strip()), "")


def _supabase_ref(value: str | None) -> str:
    if not value:
        return ""
    for pattern in (
        r"https://([a-z0-9]{20})\.supabase\.co",
        r"db\.([a-z0-9]{20})\.supabase\.co",
        r"postgres\.([a-z0-9]{20})",
    ):
        match = re.search(pattern, value)
        if match:
            return match.group(1)
    return ""


def _normalize_async_database_url(value: str) -> str:
    parsed = urlsplit(value.strip())
    scheme = parsed.scheme
    if scheme in {"postgres", "postgresql"} or scheme.startswith("postgresql+"):
        scheme = "postgresql+asyncpg"
    return urlunsplit((scheme, parsed.netloc, parsed.path, parsed.query, parsed.fragment))


def _database_url_from_parts(
    host: str | None, user: str | None, password: str | None, database: str | None
) -> str:
    host = _first_non_blank(host)
    user = _first_non_blank(user) or "postgres"
    password = _first_non_blank(password)
    database = _first_non_blank(database) or "postgres"
    if not host or not password:
        return ""
    return (
        f"postgresql+asyncpg://{quote(user, safe='')}:{quote(password, safe='')}"
        f"@{host}:5432/{quote(database, safe='')}"
    )


class Settings(BaseSettings):
    app_env: str = "development"
    api_host: str = "http://localhost:8000"
    # Comma-separated so the storefront and admin (separate domains) can both call the API.
    frontend_origin: str = "http://localhost:5173,http://localhost:5174"

    database_url: str = ""
    postgres_url: str | None = None
    postgres_prisma_url: str | None = None
    postgres_url_non_pooling: str | None = None
    postgres_host: str | None = None
    postgres_user: str | None = None
    postgres_password: str | None = None
    postgres_database: str | None = None

    supabase_url: str = ""
    next_public_supabase_url: str | None = None
    vite_supabase_url: str | None = None
    supabase_jwt_audience: str = "authenticated"
    supabase_jwks_url: str = ""
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

    @model_validator(mode="after")
    def derive_vercel_integration_settings(self) -> "Settings":
        supabase_url = _first_non_blank(
            self.supabase_url,
            self.next_public_supabase_url,
            self.vite_supabase_url,
            f"https://{self.postgres_host.removeprefix('db.').removesuffix('.supabase.co')}.supabase.co"
            if self.postgres_host and self.postgres_host.startswith("db.")
            else None,
        )
        if supabase_url and not self.supabase_url:
            object.__setattr__(self, "supabase_url", supabase_url.rstrip("/"))

        if not self.supabase_jwks_url and self.supabase_url:
            object.__setattr__(
                self,
                "supabase_jwks_url",
                f"{self.supabase_url.rstrip('/')}/auth/v1/.well-known/jwks.json",
            )

        active_ref = _supabase_ref(self.supabase_url) or _supabase_ref(self.postgres_host)
        configured_database_url = _first_non_blank(self.database_url)
        integration_candidates = [
            _first_non_blank(self.postgres_url),
            _first_non_blank(self.postgres_prisma_url),
            _first_non_blank(self.postgres_url_non_pooling),
            _database_url_from_parts(
                self.postgres_host,
                self.postgres_user,
                self.postgres_password,
                self.postgres_database,
            ),
        ]

        database_url = ""
        for candidate in integration_candidates:
            if candidate and active_ref and _supabase_ref(candidate) == active_ref:
                database_url = candidate
                break
        if not database_url:
            configured_ref = _supabase_ref(configured_database_url)
            if configured_database_url and (
                not active_ref or not configured_ref or configured_ref == active_ref
            ):
                database_url = configured_database_url
            else:
                database_url = next((candidate for candidate in integration_candidates if candidate), "")

        if database_url:
            object.__setattr__(self, "database_url", _normalize_async_database_url(database_url))
        if not self.database_url:
            raise ValueError("DATABASE_URL or Vercel Postgres/Supabase integration variables are required")
        if not self.supabase_url:
            raise ValueError("SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required")
        if not self.supabase_jwks_url:
            raise ValueError("SUPABASE_JWKS_URL is required")
        return self

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]


settings = get_settings()
