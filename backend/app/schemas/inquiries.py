from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, field_validator

InquiryKind = Literal["contact", "bulk", "corporate", "planner", "dealer", "tracking", "product"]
InquiryStatus = Literal["new", "in_progress", "resolved"]

MAX_DETAIL_KEYS = 20
MAX_DETAIL_KEY_LENGTH = 40
MAX_DETAIL_VALUE_LENGTH = 500


class InquiryBase(BaseModel):
    kind: InquiryKind
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    phone: str | None = Field(default=None, max_length=30)
    topic: str | None = Field(default=None, max_length=120)
    message: str = Field(min_length=1, max_length=5000)
    details: dict[str, str] = Field(default_factory=dict)
    source_path: str | None = Field(default=None, max_length=300)

    model_config = {"str_strip_whitespace": True}

    @field_validator("details")
    @classmethod
    def _limit_details(cls, value: dict[str, str]) -> dict[str, str]:
        if len(value) > MAX_DETAIL_KEYS:
            raise ValueError(f"details may contain at most {MAX_DETAIL_KEYS} fields")
        for key, item in value.items():
            if len(key) > MAX_DETAIL_KEY_LENGTH:
                raise ValueError(f"details keys must be at most {MAX_DETAIL_KEY_LENGTH} characters")
            if len(item) > MAX_DETAIL_VALUE_LENGTH:
                raise ValueError(
                    f"details values must be at most {MAX_DETAIL_VALUE_LENGTH} characters"
                )
        return value


class InquiryIn(InquiryBase):
    # Honeypot: real visitors never see this field, so any value marks the submission as a bot.
    website: str = ""


class InquiryCreated(BaseModel):
    id: UUID | None
    created_at: datetime


class InquiryOut(InquiryBase):
    id: UUID
    status: InquiryStatus
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class InquiryStatusUpdate(BaseModel):
    status: InquiryStatus


class NewsletterIn(BaseModel):
    email: EmailStr
    source: str | None = Field(default=None, max_length=60)


class NewsletterSubscribed(BaseModel):
    subscribed: Literal[True] = True


class NewsletterSubscriberOut(BaseModel):
    id: UUID
    email: str
    source: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
