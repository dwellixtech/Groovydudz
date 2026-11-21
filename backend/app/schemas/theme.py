import json
from datetime import datetime
from typing import Any

from pydantic import BaseModel, field_validator

MAX_THEME_BYTES = 1_000_000


class ThemeIn(BaseModel):
    draft: dict[str, Any]

    # Pydantic only turns ValueError into a 422, so TRY004 is suppressed below.
    @field_validator("draft")
    @classmethod
    def validate_draft(cls, value: dict[str, Any]) -> dict[str, Any]:
        if not isinstance(value.get("sections"), list):
            raise ValueError("draft.sections must be a list")  # noqa: TRY004
        if not isinstance(value.get("settings"), dict):
            raise ValueError("draft.settings must be an object")  # noqa: TRY004
        if len(json.dumps(value, separators=(",", ":"))) > MAX_THEME_BYTES:
            raise ValueError("draft exceeds 1 MB")
        return value


class ThemeOut(BaseModel):
    draft: dict[str, Any]
    published: dict[str, Any] | None
    published_at: datetime | None
    updated_at: datetime | None
