from datetime import datetime
from uuid import UUID

from pydantic import BaseModel, Field


class PolicyIn(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    slug: str = Field(min_length=1, max_length=120, pattern=r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
    summary: str = Field(default="", max_length=600)
    body: str = Field(min_length=1, max_length=50_000)
    position: int = 0
    is_visible: bool = True


class PolicyOut(PolicyIn):
    id: UUID
    updated_at: datetime | None

    model_config = {"from_attributes": True}
