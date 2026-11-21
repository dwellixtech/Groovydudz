from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.schemas.catalog import CollectionOut, ProductOut
from app.schemas.inquiries import InquiryCreated, InquiryIn, NewsletterIn, NewsletterSubscribed
from app.schemas.orders import ServiceabilityOut, TrackedOrder, TrackOrderRequest
from app.schemas.policies import PolicyOut
from app.services.catalog import get_public_product, list_public_products
from app.services.collections import list_public_collections
from app.services.inquiries import create_inquiry, subscribe_newsletter
from app.services.orders import track_order
from app.services.policies import get_public_policy, list_public_policies
from app.services.shipping import check_serviceability
from app.services.stores import get_default_store
from app.services.theme import get_published_theme

router = APIRouter()


@router.get("/products", response_model=list[ProductOut])
async def products(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_public_products(db, store)


@router.get("/products/{slug}", response_model=ProductOut)
async def product(slug: str, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await get_public_product(db, store, slug)


@router.get("/collections", response_model=list[CollectionOut])
async def collections(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_public_collections(db, store)


@router.get("/policies", response_model=list[PolicyOut])
async def policies(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_public_policies(db, store)


@router.get("/policies/{slug}", response_model=PolicyOut)
async def policy(slug: str, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await get_public_policy(db, store, slug)


@router.get("/theme")
async def theme(db: AsyncSession = Depends(get_db)) -> dict:
    store = await get_default_store(db)
    return await get_published_theme(db, store)


@router.post("/inquiries", response_model=InquiryCreated, status_code=201)
async def inquiry(payload: InquiryIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await create_inquiry(db, store, payload)


@router.post("/newsletter", response_model=NewsletterSubscribed, status_code=201)
async def newsletter(payload: NewsletterIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    await subscribe_newsletter(db, store, payload)
    return NewsletterSubscribed()


@router.post("/orders/track", response_model=TrackedOrder)
async def track(payload: TrackOrderRequest, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await track_order(db, store, payload)


@router.get("/serviceability/{postal_code}", response_model=ServiceabilityOut)
async def serviceability(postal_code: str):
    """Delhivery delivery check for a PIN code (used on product and checkout pages)."""
    return await check_serviceability(postal_code)
