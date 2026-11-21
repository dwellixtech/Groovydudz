import uuid

from fastapi import HTTPException
from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import Product, ProductMedia, ProductVariant, Store
from app.schemas.catalog import ProductIn
from app.services.collections import resolve_collections


async def list_public_products(db: AsyncSession, store: Store) -> list[Product]:
    result = await db.execute(
        select(Product)
        .where(Product.store_id == store.id, Product.status == "active")
        .order_by(Product.created_at.desc(), Product.id.desc())
        .limit(48)
    )
    return list(result.scalars().unique())


async def get_public_product(db: AsyncSession, store: Store, slug: str) -> Product:
    result = await db.execute(
        select(Product).where(
            Product.store_id == store.id, Product.slug == slug, Product.status == "active"
        )
    )
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")
    return product


async def list_admin_products(db: AsyncSession, store: Store) -> list[Product]:
    result = await db.execute(
        select(Product).where(Product.store_id == store.id).order_by(Product.updated_at.desc()).limit(100)
    )
    return list(result.scalars().unique())


async def create_product(db: AsyncSession, store: Store, payload: ProductIn) -> Product:
    product = Product(
        id=uuid.uuid4(),
        store_id=store.id,
        title=payload.title,
        slug=payload.slug,
        description=payload.description,
        status=payload.status,
        vendor=payload.vendor,
        product_type=payload.product_type,
        seo=payload.seo,
        published_at=None,
    )
    product.media = [
        ProductMedia(id=uuid.uuid4(), url=item.url, alt_text=item.alt_text, position=item.position)
        for item in payload.media
    ]
    product.variants = [
        ProductVariant(
            id=uuid.uuid4(),
            title=item.title,
            sku=item.sku,
            price=item.price,
            compare_at_price=item.compare_at_price,
            inventory_quantity=item.inventory_quantity,
            weight_grams=item.weight_grams,
            options=item.options,
        )
        for item in payload.variants
    ]
    product.categories = await resolve_collections(db, store, payload.collection_ids)
    db.add(product)
    await db.commit()
    await db.refresh(product)
    return product


async def update_product(db: AsyncSession, store: Store, product_id: uuid.UUID, payload: ProductIn) -> Product:
    result = await db.execute(select(Product).where(Product.store_id == store.id, Product.id == product_id))
    product = result.scalar_one_or_none()
    if product is None:
        raise HTTPException(status_code=404, detail="Product not found")

    product.title = payload.title
    product.slug = payload.slug
    product.description = payload.description
    product.status = payload.status
    product.vendor = payload.vendor
    product.product_type = payload.product_type
    product.seo = payload.seo

    product.media.clear()
    product.media.extend(
        ProductMedia(id=uuid.uuid4(), url=item.url, alt_text=item.alt_text, position=item.position)
        for item in payload.media
    )
    product.variants.clear()
    product.variants.extend(
        ProductVariant(
            id=uuid.uuid4(),
            title=item.title,
            sku=item.sku,
            price=item.price,
            compare_at_price=item.compare_at_price,
            inventory_quantity=item.inventory_quantity,
            weight_grams=item.weight_grams,
            options=item.options,
        )
        for item in payload.variants
    )
    product.categories = await resolve_collections(db, store, payload.collection_ids)
    await db.commit()
    await db.refresh(product)
    return product


async def delete_product(db: AsyncSession, store: Store, product_id: uuid.UUID) -> None:
    result = await db.execute(delete(Product).where(Product.store_id == store.id, Product.id == product_id))
    if result.rowcount == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    await db.commit()
