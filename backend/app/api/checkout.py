from typing import Annotated
from urllib.parse import urlencode
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.schemas.orders import CheckoutRequest, CheckoutResponse, PaymentStatusResponse
from app.services.orders import create_checkout, get_payment_status, process_payu_response
from app.services.stores import get_default_store

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("", response_model=CheckoutResponse)
async def checkout(payload: CheckoutRequest, db: DbSession):
    store = await get_default_store(db)
    order, payment = await create_checkout(db, store, payload)
    return CheckoutResponse(
        order_id=order.id,
        order_number=order.order_number,
        amount=order.grand_total,
        currency=order.currency,
        payment=payment,
    )


@router.post("/payu/return", include_in_schema=False)
async def payu_return(request: Request, db: DbSession):
    """PayU's surl/furl: the shopper's browser lands here (form POST) after paying."""
    data = {key: str(value) for key, value in (await request.form()).items()}
    query: dict[str, str] = {}
    try:
        order, status = await process_payu_response(db, data, source="return")
        query = {"payment": "pending" if status in {"not_found", "unknown"} else status}
        if order:
            query["order"] = str(order.id)
    except HTTPException:
        query = {"payment": "error"}
    return RedirectResponse(
        f"{settings.storefront_url.rstrip('/')}/checkout?{urlencode(query)}", status_code=303
    )


@router.get("/orders/{order_id}/status", response_model=PaymentStatusResponse)
async def payment_status(order_id: UUID, db: DbSession):
    store = await get_default_store(db)
    order, payment = await get_payment_status(db, store, order_id)
    return PaymentStatusResponse(
        order_id=order.id,
        order_number=order.order_number,
        status=order.status,
        payment_status=order.payment_status,
        payment_id=payment.provider_payment_id if payment else None,
    )
