import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.services.orders import process_payu_response

router = APIRouter()
DbSession = Annotated[AsyncSession, Depends(get_db)]


@router.post("/payu")
async def payu_webhook(request: Request, db: DbSession):
    """PayU server-to-server webhook (Dashboard → Settings → Webhooks).

    Catches payments whose browser redirect never reached us (closed tab, dropped network).
    """
    if request.headers.get("content-type", "").startswith("application/json"):
        try:
            raw = json.loads(await request.body())
        except json.JSONDecodeError as exc:
            raise HTTPException(status_code=400, detail="Invalid webhook payload") from exc
    else:
        raw = dict(await request.form())
    data = {key: "" if value is None else str(value) for key, value in raw.items()}
    order, status = await process_payu_response(db, data, source="webhook")
    return {"received": True, "order_id": str(order.id) if order else None, "payment_status": status}
