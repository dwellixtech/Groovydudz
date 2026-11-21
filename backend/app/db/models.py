import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import Column, DateTime, ForeignKey, Numeric, Table, Text, UniqueConstraint, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )


class Store(Base, TimestampMixin):
    __tablename__ = "stores"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    name: Mapped[str]
    slug: Mapped[str]
    domain: Mapped[str | None]
    currency: Mapped[str]


product_categories = Table(
    "product_categories",
    Base.metadata,
    Column("product_id", ForeignKey("products.id", ondelete="CASCADE"), primary_key=True),
    Column("category_id", ForeignKey("categories.id", ondelete="CASCADE"), primary_key=True),
)


class Category(Base, TimestampMixin):
    __tablename__ = "categories"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    parent_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("categories.id"))
    title: Mapped[str]
    slug: Mapped[str]
    description: Mapped[str | None]
    image_url: Mapped[str | None]
    position: Mapped[int]
    is_visible: Mapped[bool]


class Product(Base, TimestampMixin):
    __tablename__ = "products"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    title: Mapped[str]
    slug: Mapped[str]
    description: Mapped[str | None]
    status: Mapped[str]
    vendor: Mapped[str | None]
    product_type: Mapped[str | None]
    seo: Mapped[dict[str, Any]] = mapped_column(JSONB)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    media: Mapped[list["ProductMedia"]] = relationship(lazy="selectin", cascade="all, delete-orphan")
    variants: Mapped[list["ProductVariant"]] = relationship(
        lazy="selectin", cascade="all, delete-orphan"
    )
    categories: Mapped[list[Category]] = relationship(secondary=product_categories, lazy="selectin")

    @property
    def collection_ids(self) -> list[uuid.UUID]:
        return [category.id for category in self.categories]


class ProductMedia(Base, TimestampMixin):
    __tablename__ = "product_media"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    url: Mapped[str]
    alt_text: Mapped[str | None]
    position: Mapped[int]


class ProductVariant(Base, TimestampMixin):
    __tablename__ = "product_variants"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    product_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("products.id", ondelete="CASCADE"))
    title: Mapped[str]
    sku: Mapped[str | None]
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    compare_at_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2))
    inventory_quantity: Mapped[int]
    weight_grams: Mapped[int | None]
    options: Mapped[dict[str, Any]] = mapped_column(JSONB)


class Order(Base, TimestampMixin):
    __tablename__ = "orders"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    order_number: Mapped[str]
    email: Mapped[str]
    phone: Mapped[str | None]
    customer_name: Mapped[str]
    status: Mapped[str]
    payment_status: Mapped[str]
    fulfillment_status: Mapped[str]
    subtotal: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    shipping_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    tax_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    grand_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str]
    shipping_address: Mapped[dict[str, Any]] = mapped_column(JSONB)
    billing_address: Mapped[dict[str, Any]] = mapped_column(JSONB)
    lines: Mapped[list["OrderLine"]] = relationship(lazy="selectin", cascade="all, delete-orphan")
    # Not eagerly loaded; callers that need shipments use selectinload(Order.fulfillments).
    fulfillments: Mapped[list["Fulfillment"]] = relationship(order_by="Fulfillment.created_at")


class OrderLine(Base, TimestampMixin):
    __tablename__ = "order_lines"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    product_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("products.id"))
    variant_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("product_variants.id"))
    title: Mapped[str]
    sku: Mapped[str | None]
    quantity: Mapped[int]
    unit_price: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    line_total: Mapped[Decimal] = mapped_column(Numeric(12, 2))


class Payment(Base, TimestampMixin):
    __tablename__ = "payments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    provider: Mapped[str]
    provider_payment_id: Mapped[str | None]
    provider_order_id: Mapped[str | None]
    status: Mapped[str]
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2))
    currency: Mapped[str]
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB)


class Fulfillment(Base, TimestampMixin):
    __tablename__ = "fulfillments"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    order_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("orders.id", ondelete="CASCADE"))
    provider: Mapped[str]
    status: Mapped[str]
    tracking_number: Mapped[str | None]
    tracking_url: Mapped[str | None]
    label_url: Mapped[str | None]
    raw_payload: Mapped[dict[str, Any]] = mapped_column(JSONB)


class StoreIntegration(Base, TimestampMixin):
    __tablename__ = "store_integrations"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    provider_key: Mapped[str]
    kind: Mapped[str]
    status: Mapped[str]
    config: Mapped[dict[str, Any]] = mapped_column(JSONB)
    secret_ref: Mapped[str | None]


class StoreTheme(Base, TimestampMixin):
    __tablename__ = "store_themes"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    draft: Mapped[dict[str, Any]] = mapped_column(JSONB)
    published: Mapped[dict[str, Any] | None] = mapped_column(JSONB)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class StorePolicy(Base, TimestampMixin):
    __tablename__ = "store_policies"
    __table_args__ = (UniqueConstraint("store_id", "slug"),)

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    title: Mapped[str]
    slug: Mapped[str]
    summary: Mapped[str] = mapped_column(Text)
    body: Mapped[str] = mapped_column(Text)
    position: Mapped[int]
    is_visible: Mapped[bool]


class StoreInquiry(Base, TimestampMixin):
    __tablename__ = "store_inquiries"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    kind: Mapped[str]
    name: Mapped[str]
    email: Mapped[str]
    phone: Mapped[str | None]
    topic: Mapped[str | None]
    message: Mapped[str] = mapped_column(Text)
    details: Mapped[dict[str, Any]] = mapped_column(JSONB)
    status: Mapped[str]
    source_path: Mapped[str | None]


class NewsletterSubscriber(Base, TimestampMixin):
    __tablename__ = "newsletter_subscribers"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    email: Mapped[str]
    source: Mapped[str | None]


class WebhookEvent(Base):
    # Append-only log: the table has created_at but no updated_at.
    __tablename__ = "webhook_events"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    store_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("stores.id", ondelete="CASCADE"))
    provider_key: Mapped[str]
    event_id: Mapped[str | None]
    event_type: Mapped[str]
    payload: Mapped[dict[str, Any]] = mapped_column(JSONB)
    processed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=text("now()"), nullable=False
    )
