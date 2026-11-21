from dataclasses import dataclass
from typing import Protocol


@dataclass(frozen=True)
class ProviderInfo:
    key: str
    kind: str
    display_name: str


class Provider(Protocol):
    info: ProviderInfo

    @property
    def is_configured(self) -> bool:
        ...
