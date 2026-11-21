import uuid
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Store, StorePolicy
from app.schemas.policies import PolicyIn


def _ordered(query):
    return query.order_by(StorePolicy.position, StorePolicy.title)


async def list_public_policies(db: AsyncSession, store: Store) -> list[StorePolicy]:
    result = await db.execute(
        _ordered(select(StorePolicy).where(StorePolicy.store_id == store.id, StorePolicy.is_visible.is_(True)))
    )
    return list(result.scalars())


async def get_public_policy(db: AsyncSession, store: Store, slug: str) -> StorePolicy:
    result = await db.execute(
        select(StorePolicy).where(
            StorePolicy.store_id == store.id,
            StorePolicy.slug == slug,
            StorePolicy.is_visible.is_(True),
        )
    )
    policy = result.scalar_one_or_none()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy


async def list_admin_policies(db: AsyncSession, store: Store) -> list[StorePolicy]:
    result = await db.execute(_ordered(select(StorePolicy).where(StorePolicy.store_id == store.id)))
    return list(result.scalars())


async def save_policy(db: AsyncSession, store: Store, policy_id: UUID | None, payload: PolicyIn) -> StorePolicy:
    if policy_id is None:
        policy = StorePolicy(id=uuid.uuid4(), store_id=store.id)
        db.add(policy)
    else:
        policy = await _get_admin_policy(db, store, policy_id)

    policy.title = payload.title.strip()
    policy.slug = payload.slug
    policy.summary = payload.summary.strip()
    policy.body = payload.body.strip()
    policy.position = payload.position
    policy.is_visible = payload.is_visible
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Another policy already uses this URL handle") from exc
    await db.refresh(policy)
    return policy


async def delete_policy(db: AsyncSession, store: Store, policy_id: UUID) -> None:
    policy = await _get_admin_policy(db, store, policy_id)
    await db.delete(policy)
    await db.commit()


async def _get_admin_policy(db: AsyncSession, store: Store, policy_id: UUID) -> StorePolicy:
    result = await db.execute(select(StorePolicy).where(StorePolicy.store_id == store.id, StorePolicy.id == policy_id))
    policy = result.scalar_one_or_none()
    if policy is None:
        raise HTTPException(status_code=404, detail="Policy not found")
    return policy
