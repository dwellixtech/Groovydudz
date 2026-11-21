from hmac import compare_digest
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import get_db
from app.services.orders import reconcile_pending_payments

router = APIRouter()


def require_cron_secret(authorization: Annotated[str, Header()] = "") -> None:
    expected = f"Bearer {settings.cron_secret}" if settings.cron_secret else None
    if not expected or not compare_digest(authorization, expected):
        raise HTTPException(status_code=401, detail="Unauthorized")


@router.get("/reconcile-payments", dependencies=[Depends(require_cron_secret)])
async def reconcile_payments(db: Annotated[AsyncSession, Depends(get_db)]):
    """Settles PayU orders stuck in pending (closed tab, lost redirect, missed webhook).

    Called by Vercel Cron (see vercel.json); safe to call by hand with the CRON_SECRET.
    """
    return await reconcile_pending_payments(db)
