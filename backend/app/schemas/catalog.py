from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, Field


class ProductVariantIn(BaseModel):
    title: str = "Default"
    sku: str | None = None
    price: Decimal = Field(ge=0)
    compare_at_price: Decimal | None = Field(default=None, ge=0)
    inventory_quantity: int = Field(default=0, ge=0)
    weight_grams: int | None = Field(default=None, ge=0)
    options: dict[str, str] = {}


class ProductMediaIn(BaseModel):
    url: str
    alt_text: str | None = None
    position: int = 0


class ProductIn(BaseModel):
    title: str
    slug: str
    description: str | None = None
    status: str = "draft"
    vendor: str | None = "GroovyDudz"
    product_type: str | None = None
    seo: dict[str, str] = {}
    media: list[ProductMediaIn] = []
    variants: list[ProductVariantIn] = []
    collection_ids: list[UUID] = []


class ProductVariantOut(ProductVariantIn):
    id: UUID

    model_config = {"from_attributes": True}


class ProductMediaOut(ProductMediaIn):
    id: UUID

    model_config = {"from_attributes": True}


class ProductOut(BaseModel):
    id: UUID
    title: str
    slug: str
    description: str | None
    status: str
    vendor: str | None
    product_type: str | None
    seo: dict
    media: list[ProductMediaOut]
    variants: list[ProductVariantOut]
    collection_ids: list[UUID]

    model_config = {"from_attributes": True}


class CollectionIn(BaseModel):
    title: str
    slug: str
    description: str | None = None
    image_url: str | None = None
    position: int = 0
    is_visible: bool = True


class CollectionOut(CollectionIn):
    id: UUID
    product_count: int
