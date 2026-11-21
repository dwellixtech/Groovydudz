import uuid
from datetime import UTC, datetime
from uuid import UUID

from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import NewsletterSubscriber, Store, StoreInquiry
from app.schemas.inquiries import InquiryCreated, InquiryIn, InquiryStatus, NewsletterIn


async def create_inquiry(db: AsyncSession, store: Store, payload: InquiryIn) -> InquiryCreated:
    # Honeypot hit: pretend success so bots get no signal, but store nothing.
    if payload.website:
        return InquiryCreated(id=None, created_at=datetime.now(UTC))

    inquiry = StoreInquiry(
        id=uuid.uuid4(),
        store_id=store.id,
        kind=payload.kind,
        name=payload.name,
        email=str(payload.email),
        phone=payload.phone or None,
        topic=payload.topic or None,
        message=payload.message,
        details=payload.details,
        status="new",
        source_path=payload.source_path or None,
    )
    db.add(inquiry)
    await db.commit()
    await db.refresh(inquiry)
    return InquiryCreated(id=inquiry.id, created_at=inquiry.created_at)


async def list_inquiries(
    db: AsyncSession, store: Store, status: InquiryStatus | None = None
) -> list[StoreInquiry]:
    query = select(StoreInquiry).where(StoreInquiry.store_id == store.id)
    if status is not None:
        query = query.where(StoreInquiry.status == status)
    result = await db.execute(query.order_by(StoreInquiry.created_at.desc()).limit(200))
    return list(result.scalars())


async def update_inquiry_status(
    db: AsyncSession, store: Store, inquiry_id: UUID, status: InquiryStatus
) -> StoreInquiry:
    result = await db.execute(
        select(StoreInquiry).where(StoreInquiry.store_id == store.id, StoreInquiry.id == inquiry_id)
    )
    inquiry = result.scalar_one_or_none()
    if inquiry is None:
        raise HTTPException(status_code=404, detail="Inquiry not found")
    inquiry.status = status
    await db.commit()
    await db.refresh(inquiry)
    return inquiry


async def subscribe_newsletter(db: AsyncSession, store: Store, payload: NewsletterIn) -> None:
    # Idempotent: the (store_id, lower(email)) unique index absorbs repeat sign-ups.
    statement = (
        insert(NewsletterSubscriber)
        .values(
            id=uuid.uuid4(),
            store_id=store.id,
            email=str(payload.email).lower(),
            source=payload.source or None,
        )
        .on_conflict_do_nothing(
            index_elements=[NewsletterSubscriber.store_id, func.lower(NewsletterSubscriber.email)]
        )
    )
    await db.execute(statement)
    await db.commit()


async def list_newsletter_subscribers(db: AsyncSession, store: Store) -> list[NewsletterSubscriber]:
    result = await db.execute(
        select(NewsletterSubscriber)
        .where(NewsletterSubscriber.store_id == store.id)
        .order_by(NewsletterSubscriber.created_at.desc())
        .limit(1000)
    )
    return list(result.scalars())
