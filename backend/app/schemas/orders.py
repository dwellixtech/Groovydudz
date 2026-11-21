from datetime import datetime
from decimal import Decimal
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field, model_validator


class Address(BaseModel):
    name: str
    line1: str
    line2: str | None = None
    city: str
    state: str
    postal_code: str
    country: str = "IN"
    phone: str


class CheckoutLine(BaseModel):
    variant_id: UUID
    quantity: int = Field(gt=0)


class CheckoutRequest(BaseModel):
    email: EmailStr
    phone: str | None = None
    customer_name: str
    shipping_address: Address
    billing_address: Address | None = None
    lines: list[CheckoutLine]


class PaymentRedirect(BaseModel):
    """A form the browser must POST to the gateway's hosted payment page."""

    provider: str
    action_url: str
    params: dict[str, str]


class CheckoutResponse(BaseModel):
    order_id: UUID
    order_number: str
    amount: Decimal
    currency: str
    payment: PaymentRedirect


class PaymentStatusResponse(BaseModel):
    order_id: UUID
    order_number: str
    status: str
    payment_status: str
    payment_id: str | None


class ServiceabilityOut(BaseModel):
    postal_code: str
    serviceable: bool
    message: str | None = None


class FulfillmentOut(BaseModel):
    id: UUID
    provider: str
    status: str
    tracking_number: str | None
    tracking_url: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class OrderLineOut(BaseModel):
    id: UUID
    title: str
    sku: str | None
    quantity: int
    unit_price: Decimal
    line_total: Decimal

    model_config = {"from_attributes": True}


class OrderOut(BaseModel):
    id: UUID
    order_number: str
    email: str
    customer_name: str
    status: str
    payment_status: str
    fulfillment_status: str
    grand_total: Decimal
    currency: str
    lines: list[OrderLineOut]
    fulfillments: list[FulfillmentOut] = []

    model_config = {"from_attributes": True}


class TrackOrderRequest(BaseModel):
    method: Literal["email", "mobile", "awb"] = "email"
    order_number: str | None = Field(default=None, max_length=40)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)
    tracking_number: str | None = Field(default=None, max_length=80)

    @model_validator(mode="after")
    def validate_lookup(self) -> "TrackOrderRequest":
        if self.method == "email" and not (self.order_number and self.email):
            raise ValueError("order number and email are required")
        if self.method == "mobile" and not (self.order_number and self.phone):
            raise ValueError("order number and mobile number are required")
        if self.method == "awb" and not (self.tracking_number and (self.email or self.phone)):
            raise ValueError("tracking number and email or mobile number are required")
        return self


class TrackedOrderLine(BaseModel):
    title: str
    quantity: int
    line_total: Decimal

    model_config = {"from_attributes": True}


class TrackedShipment(BaseModel):
    provider: str
    status: str
    tracking_number: str | None
    tracking_url: str | None
    updated_at: datetime

    model_config = {"from_attributes": True}


class TrackedOrder(BaseModel):
    order_number: str
    created_at: datetime
    status: str
    payment_status: str
    fulfillment_status: str
    subtotal: Decimal
    shipping_total: Decimal
    grand_total: Decimal
    currency: str
    lines: list[TrackedOrderLine]
    shipments: list[TrackedShipment] = Field(validation_alias="fulfillments")

    model_config = {"from_attributes": True}
