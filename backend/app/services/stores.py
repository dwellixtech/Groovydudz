from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.models import Store


async def get_default_store(db: AsyncSession) -> Store:
    result = await db.execute(select(Store).where(Store.slug == settings.default_store_slug))
    store = result.scalar_one_or_none()
    if store is None:
        raise HTTPException(status_code=500, detail="Default store is not configured")
    return store
