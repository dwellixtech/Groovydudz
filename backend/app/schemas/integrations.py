from uuid import UUID

from pydantic import BaseModel, Field


class IntegrationInstall(BaseModel):
    provider_key: str
    kind: str
    config: dict = {}
    secret_ref: str | None = None


class IntegrationOut(BaseModel):
    id: UUID
    provider_key: str
    kind: str
    status: str
    config: dict
    secret_ref: str | None

    model_config = {"from_attributes": True}


class DelhiverySettingsIn(BaseModel):
    pickup_location: str = Field(min_length=1, max_length=120)
