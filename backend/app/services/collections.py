import uuid

from fastapi import HTTPException
from sqlalchemy import delete, func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Category, Product, Store, product_categories
from app.schemas.catalog import CollectionIn, CollectionOut


async def _list_collections(db: AsyncSession, store: Store, public: bool) -> list[CollectionOut]:
    counts = select(product_categories.c.category_id, func.count().label("product_count")).join(
        Product, Product.id == product_categories.c.product_id
    )
    if public:
        counts = counts.where(Product.status == "active")
    counts = counts.group_by(product_categories.c.category_id).subquery()

    query = (
        select(Category, func.coalesce(counts.c.product_count, 0))
        .outerjoin(counts, counts.c.category_id == Category.id)
        .where(Category.store_id == store.id)
        .order_by(Category.position, Category.title)
    )
    if public:
        query = query.where(Category.is_visible.is_(True))
    result = await db.execute(query)
    return [_to_out(category, count) for category, count in result.all()]


async def list_public_collections(db: AsyncSession, store: Store) -> list[CollectionOut]:
    return await _list_collections(db, store, public=True)


async def list_admin_collections(db: AsyncSession, store: Store) -> list[CollectionOut]:
    return await _list_collections(db, store, public=False)


async def resolve_collections(
    db: AsyncSession, store: Store, ids: list[uuid.UUID]
) -> list[Category]:
    """Load the store's collections for ids; unknown or foreign ids are rejected with 400."""
    if not ids:
        return []
    wanted = set(ids)
    result = await db.execute(
        select(Category).where(Category.store_id == store.id, Category.id.in_(wanted))
    )
    categories = list(result.scalars())
    if len(categories) != len(wanted):
        raise HTTPException(status_code=400, detail="Unknown collection id")
    return categories


async def create_collection(db: AsyncSession, store: Store, payload: CollectionIn) -> CollectionOut:
    category = Category(id=uuid.uuid4(), store_id=store.id, parent_id=None, **payload.model_dump())
    db.add(category)
    await _commit(db)
    await db.refresh(category)
    return _to_out(category, 0)


async def update_collection(
    db: AsyncSession, store: Store, collection_id: uuid.UUID, payload: CollectionIn
) -> CollectionOut:
    category = await _get_collection(db, store, collection_id)
    for field, value in payload.model_dump().items():
        setattr(category, field, value)
    await _commit(db)
    await db.refresh(category)
    return _to_out(category, await _count_products(db, category.id))


async def delete_collection(db: AsyncSession, store: Store, collection_id: uuid.UUID) -> None:
    result = await db.execute(
        delete(Category).where(Category.store_id == store.id, Category.id == collection_id)
    )
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Collection not found")
    await db.commit()


async def _get_collection(db: AsyncSession, store: Store, collection_id: uuid.UUID) -> Category:
    result = await db.execute(
        select(Category).where(Category.store_id == store.id, Category.id == collection_id)
    )
    category = result.scalar_one_or_none()
    if category is None:
        raise HTTPException(status_code=404, detail="Collection not found")
    return category


async def _count_products(db: AsyncSession, category_id: uuid.UUID) -> int:
    result = await db.execute(
        select(func.count())
        .select_from(product_categories)
        .where(product_categories.c.category_id == category_id)
    )
    return result.scalar_one()


async def _commit(db: AsyncSession) -> None:
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=409, detail="Collection slug already exists") from exc


def _to_out(category: Category, product_count: int) -> CollectionOut:
    return CollectionOut(
        id=category.id,
        title=category.title,
        slug=category.slug,
        description=category.description,
        image_url=category.image_url,
        position=category.position,
        is_visible=category.is_visible,
        product_count=product_count,
    )
