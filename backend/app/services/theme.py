import uuid
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Store, StoreTheme
from app.schemas.theme import ThemeIn, ThemeOut


async def _get_theme(db: AsyncSession, store: Store) -> StoreTheme | None:
    result = await db.execute(select(StoreTheme).where(StoreTheme.store_id == store.id))
    return result.scalar_one_or_none()


async def get_published_theme(db: AsyncSession, store: Store) -> dict:
    theme = await _get_theme(db, store)
    if theme is None or theme.published is None:
        raise HTTPException(status_code=404, detail="No published theme")
    return theme.published


async def get_admin_theme(db: AsyncSession, store: Store) -> ThemeOut:
    theme = await _get_theme(db, store)
    if theme is None:
        return ThemeOut(draft={}, published=None, published_at=None, updated_at=None)
    return _to_out(theme)


async def save_theme_draft(db: AsyncSession, store: Store, payload: ThemeIn) -> ThemeOut:
    theme = await _get_theme(db, store)
    if theme is None:
        theme = StoreTheme(id=uuid.uuid4(), store_id=store.id, draft=payload.draft, published=None)
        db.add(theme)
    else:
        theme.draft = payload.draft
    await db.commit()
    await db.refresh(theme)
    return _to_out(theme)


async def publish_theme(db: AsyncSession, store: Store) -> ThemeOut:
    theme = await _get_theme(db, store)
    if theme is None:
        raise HTTPException(status_code=404, detail="No theme draft to publish")
    theme.published = dict(theme.draft)
    theme.published_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(theme)
    return _to_out(theme)


def _to_out(theme: StoreTheme) -> ThemeOut:
    return ThemeOut(
        draft=theme.draft,
        published=theme.published,
        published_at=theme.published_at,
        updated_at=theme.updated_at,
    )
