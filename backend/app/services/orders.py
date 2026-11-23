import uuid
from datetime import UTC, datetime
from decimal import Decimal, InvalidOperation
from typing import Any

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.config import settings
from app.db.models import (
    Fulfillment,
    Order,
    OrderLine,
    Payment,
    Product,
    ProductVariant,
    Store,
    WebhookEvent,
)
from app.integrations.payment.payu_provider import PayUPaymentProvider
from app.integrations.shipping.delhivery_provider import DelhiveryShippingProvider
from app.schemas.orders import CheckoutRequest, PaymentRedirect, TrackOrderRequest

TRACK_ORDER_NOT_FOUND = "We couldn't find an order with those tracking details."


async def list_orders(db: AsyncSession, store: Store) -> list[Order]:
    result = await db.execute(
        select(Order)
        .options(selectinload(Order.fulfillments))
        .where(Order.store_id == store.id)
        .order_by(Order.created_at.desc())
        .limit(100)
    )
    return list(result.scalars().unique())


async def create_checkout(
    db: AsyncSession, store: Store, payload: CheckoutRequest
) -> tuple[Order, PaymentRedirect]:
    if not payload.lines:
        raise HTTPException(status_code=400, detail="Cart is empty")
    payment_provider = PayUPaymentProvider.from_settings()
    if not payment_provider.is_configured:
        raise HTTPException(status_code=503, detail="PayU is not configured")
    await _ensure_serviceable(payload.shipping_address.postal_code)

    variant_ids = [line.variant_id for line in payload.lines]
    result = await db.execute(
        select(ProductVariant, Product)
        .join(Product, Product.id == ProductVariant.product_id)
        .where(ProductVariant.id.in_(variant_ids))
    )
    variants = {variant.id: (variant, product) for variant, product in result.tuples()}
    if len(variants) != len(set(variant_ids)):
        raise HTTPException(status_code=400, detail="One or more variants are unavailable")

    subtotal = Decimal("0.00")
    order_lines: list[OrderLine] = []
    for line in payload.lines:
        variant, product = variants[line.variant_id]
        if variant.price <= 0:
            # Unpriced catalog items must never be sold for free.
            raise HTTPException(status_code=400, detail=f"{product.title} is not available for purchase")
        if variant.inventory_quantity < line.quantity:
            raise HTTPException(status_code=400, detail=f"{product.title} is out of stock")
        line_total = variant.price * line.quantity
        subtotal += line_total
        order_lines.append(
            OrderLine(
                id=uuid.uuid4(),
                product_id=variant.product_id,
                variant_id=variant.id,
                title=_line_title(product, variant),
                sku=variant.sku,
                quantity=line.quantity,
                unit_price=variant.price,
                line_total=line_total,
            )
        )

    shipping_total = Decimal("0.00") if subtotal >= Decimal("499.00") else Decimal("49.00")
    tax_total = Decimal("0.00")
    grand_total = subtotal + shipping_total + tax_total
    order = Order(
        id=uuid.uuid4(),
        store_id=store.id,
        order_number=f"GD-{uuid.uuid4().hex[:8].upper()}",
        email=str(payload.email),
        phone=payload.phone,
        customer_name=payload.customer_name,
        status="pending",
        payment_status="pending",
        fulfillment_status="unfulfilled",
        subtotal=subtotal,
        shipping_total=shipping_total,
        tax_total=tax_total,
        grand_total=grand_total,
        currency=store.currency,
        shipping_address=payload.shipping_address.model_dump(),
        billing_address=(payload.billing_address or payload.shipping_address).model_dump(),
        lines=order_lines,
    )
    db.add(order)
    await db.flush()

    # PayU txnid: unique, alphanumeric, max 25 chars. The order number is already unique per store.
    txnid = order.order_number.replace("-", "")
    return_url = f"{settings.api_host.rstrip('/')}/checkout/payu/return"
    params = payment_provider.build_payment_request(
        txnid=txnid,
        amount=grand_total,
        productinfo=f"{store.name} order {order.order_number}",
        firstname=payload.customer_name,
        email=str(payload.email),
        phone=payload.phone or payload.shipping_address.phone,
        surl=return_url,
        furl=return_url,
        udf1=str(order.id),
    )
    db.add(
        Payment(
            id=uuid.uuid4(),
            order_id=order.id,
            provider="payu",
            provider_order_id=txnid,
            provider_payment_id=None,
            status="created",
            amount=grand_total,
            currency=store.currency,
            raw_payload={"request": {k: v for k, v in params.items() if k != "hash"}},
        )
    )

    await db.commit()
    await db.refresh(order)
    return order, PaymentRedirect(provider="payu", action_url=payment_provider.payment_url, params=params)


async def _ensure_serviceable(postal_code: str) -> None:
    """Block checkout for PIN codes Delhivery can't deliver to. Fails open if Delhivery is down."""
    shipping = DelhiveryShippingProvider()
    if not shipping.is_configured:
        return
    try:
        result = await shipping.check_serviceability(postal_code)
    except Exception:  # noqa: BLE001 - fail open; courier outages must not block sales
        return
    if not result["serviceable"]:
        raise HTTPException(
            status_code=400, detail=f"Sorry, we can't deliver to PIN code {postal_code} yet."
        )


def _line_title(product: Product, variant: ProductVariant) -> str:
    # Single-variant products carry the placeholder title "Default"; only real variants are shown.
    if variant.title and variant.title != "Default":
        return f"{product.title} – {variant.title}"
    return product.title


async def track_order(db: AsyncSession, store: Store, payload: TrackOrderRequest) -> Order:
    query = select(Order).options(selectinload(Order.fulfillments)).where(Order.store_id == store.id)

    if payload.method == "awb":
        tracking_number = "".join((payload.tracking_number or "").split()).upper()
        query = query.join(Fulfillment, Fulfillment.order_id == Order.id).where(
            func.upper(Fulfillment.tracking_number) == tracking_number
        )
    else:
        order_number = "".join((payload.order_number or "").split()).upper()
        query = query.where(func.upper(Order.order_number) == order_number)

    if payload.email:
        query = query.where(func.lower(Order.email) == str(payload.email).lower())
    elif payload.phone:
        phone_digits = _phone_digits(payload.phone)
        if not phone_digits:
            raise HTTPException(status_code=400, detail="Enter a valid mobile number")
        order_phone = func.regexp_replace(func.coalesce(Order.phone, ""), r"\D", "", "g")
        query = query.where(func.right(order_phone, 10) == phone_digits[-10:])

    result = await db.execute(query)
    order = result.scalars().unique().first()
    # Same message whether the number or the email was wrong, so neither can be probed.
    if order is None:
        raise HTTPException(status_code=404, detail=TRACK_ORDER_NOT_FOUND)
    return order


def _phone_digits(value: str) -> str:
    return "".join(char for char in value if char.isdigit())


async def get_payment_status(db: AsyncSession, store: Store, order_id: uuid.UUID) -> tuple[Order, Payment | None]:
    result = await db.execute(
        select(Order).where(Order.id == order_id, Order.store_id == store.id)
    )
    order = result.scalar_one_or_none()
    if order is None:
        raise HTTPException(status_code=404, detail="Order not found")
    payment_result = await db.execute(
        select(Payment).where(Payment.order_id == order.id).order_by(Payment.created_at.desc()).limit(1)
    )
    return order, payment_result.scalar_one_or_none()


async def process_payu_response(
    db: AsyncSession, data: dict[str, str], source: str
) -> tuple[Order | None, str]:
    """Handle a PayU surl/furl redirect or webhook. Returns (order, normalized status).

    The reverse hash proves PayU sent the data; the verify_payment API call then confirms the
    final state server-to-server, so a replayed or tampered redirect can't mark an order paid.
    """
    provider = PayUPaymentProvider.from_settings()
    if not provider.is_configured:
        raise HTTPException(status_code=503, detail="PayU is not configured")
    if not provider.verify_response_hash(data):
        raise HTTPException(status_code=400, detail="Invalid PayU hash")

    txnid = data.get("txnid", "")
    result = await db.execute(
        select(Order, Payment)
        .options(selectinload(Order.lines))
        .join(Payment, Payment.order_id == Order.id)
        .where(Payment.provider == "payu", Payment.provider_order_id == txnid)
    )
    row = result.one_or_none()
    order, payment = row if row else (None, None)

    status = "unknown"
    if order and payment:
        status = await _settle_payment(db, provider, order, payment, txnid, data)

    event = WebhookEvent(
        id=uuid.uuid4(),
        store_id=order.store_id if order else None,
        provider_key="payu",
        event_id=f"{source}:{data.get('mihpayid') or txnid}:{data.get('status')}",
        event_type=f"{source}.{data.get('status') or 'unknown'}",
        payload=data,
        processed_at=datetime.now(UTC),
    )
    try:
        # Savepoint: a repeated callback (PayU retries webhooks) only skips the log row; the order
        # state settled above must still be saved.
        async with db.begin_nested():
            db.add(event)
    except IntegrityError:
        pass
    await db.commit()
    return order, status


async def _settle_payment(
    db: AsyncSession,
    provider: PayUPaymentProvider,
    order: Order,
    payment: Payment,
    txnid: str,
    callback: dict[str, str] | None = None,
) -> str:
    """Ask PayU for the authoritative state of `txnid` and apply it. Returns the normalized status.

    If PayU can't be reached the order stays pending until PayU sends another callback/webhook
    or staff review it manually. A customer who really paid is never shown "failed" because our
    check timed out.
    """
    callback = callback or {}
    try:
        verified = await provider.verify_payment(txnid)
    except Exception:  # noqa: BLE001 - network/API failure means "unknown yet", not "failed"
        return "pending"
    status = _payu_status(verified.get("status"), verified.get("unmappedstatus"))
    amount = verified.get("amt") or verified.get("transaction_amount") or callback.get("amount")
    if status == "paid" and _to_decimal(amount) != order.grand_total:
        status = "failed"
        verified = {**verified, "groovydudz_error": "amount_mismatch"}
    payment_id = str(verified.get("mihpayid") or callback.get("mihpayid") or "")
    if payment_id.lower() == "not found":
        payment_id = ""
    if status == "paid":
        await _mark_paid(db, order, payment, payment_id, verified)
    else:
        _apply_payment_state(order, payment, payment_id, verified, status)
    return status


def _to_decimal(value: Any) -> Decimal | None:
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError):
        return None


def _payu_status(value: Any, unmapped: Any = None) -> str:
    status = str(value or "").lower()
    detail = str(unmapped or "").lower()
    if status == "success":
        return "paid"
    if detail == "usercancelled" or status == "usercancelled":
        return "cancelled"
    if status in {"failure", "failed", "dropped", "bounced"}:
        return "failed"
    if status == "not found":
        return "not_found"
    return "pending"


async def _mark_paid(
    db: AsyncSession, order: Order, payment: Payment, payment_id: str, raw_payload: dict[str, Any]
) -> None:
    was_paid = order.payment_status == "paid" and payment.status == "paid"
    _apply_payment_state(order, payment, payment_id, raw_payload, "paid")
    if was_paid:
        return
    for line in order.lines:
        if not line.variant_id:
            continue
        variant = await db.get(ProductVariant, line.variant_id)
        if variant:
            variant.inventory_quantity = max(0, variant.inventory_quantity - line.quantity)


def _apply_payment_state(
    order: Order, payment: Payment, payment_id: str, raw_payload: dict[str, Any], status: str
) -> None:
    payment.provider_payment_id = payment_id or payment.provider_payment_id
    payment.raw_payload = {**payment.raw_payload, "latest": raw_payload}
    if order.payment_status == "paid" and status != "paid":
        # Never downgrade a confirmed payment because of a late or out-of-order failure event.
        return
    if status == "paid":
        payment.status = "paid"
        order.payment_status = "paid"
        order.status = "confirmed"
    elif status == "failed":
        payment.status = "failed"
        order.payment_status = "failed"
    elif status in {"cancelled", "abandoned"}:
        # Shopper backed out (or never paid). Stock was never reserved, so nothing to release.
        payment.status = status
        order.payment_status = "failed"
        order.status = "cancelled"
    elif status == "not_found":
        payment.status = "pending"
    else:
        payment.status = status
