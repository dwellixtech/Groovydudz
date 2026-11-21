import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import Principal, require_staff
from app.db.models import StoreIntegration
from app.db.session import get_db
from app.integrations.registry import available_providers
from app.schemas.catalog import CollectionIn, CollectionOut, ProductIn, ProductOut
from app.schemas.inquiries import (
    InquiryOut,
    InquiryStatus,
    InquiryStatusUpdate,
    NewsletterSubscriberOut,
)
from app.schemas.integrations import DelhiverySettingsIn, IntegrationInstall, IntegrationOut
from app.schemas.orders import FulfillmentOut, OrderOut
from app.schemas.policies import PolicyIn, PolicyOut
from app.schemas.theme import ThemeIn, ThemeOut
from app.services.catalog import create_product, delete_product, list_admin_products, update_product
from app.services.collections import (
    create_collection,
    delete_collection,
    list_admin_collections,
    update_collection,
)
from app.services.inquiries import (
    list_inquiries,
    list_newsletter_subscribers,
    update_inquiry_status,
)
from app.services.orders import list_orders
from app.services.policies import delete_policy, list_admin_policies, save_policy
from app.services.shipping import (
    cancel_shipment,
    create_shipment,
    delhivery_settings,
    save_delhivery_settings,
    refresh_tracking,
    shipment_label,
)
from app.services.stores import get_default_store
from app.services.theme import get_admin_theme, publish_theme, save_theme_draft

router = APIRouter(dependencies=[Depends(require_staff)])


@router.get("/products", response_model=list[ProductOut])
async def products(db: AsyncSession = Depends(get_db), _: Principal = Depends(require_staff)):
    store = await get_default_store(db)
    return await list_admin_products(db, store)


@router.post("/products", response_model=ProductOut)
async def create(payload: ProductIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await create_product(db, store, payload)


@router.put("/products/{product_id}", response_model=ProductOut)
async def update(product_id: UUID, payload: ProductIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await update_product(db, store, product_id, payload)


@router.delete("/products/{product_id}", status_code=204)
async def delete_listing(product_id: UUID, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    await delete_product(db, store, product_id)


@router.get("/collections", response_model=list[CollectionOut])
async def collections(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_admin_collections(db, store)


@router.post("/collections", response_model=CollectionOut)
async def create_listing_collection(payload: CollectionIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await create_collection(db, store, payload)


@router.put("/collections/{collection_id}", response_model=CollectionOut)
async def update_listing_collection(
    collection_id: UUID, payload: CollectionIn, db: AsyncSession = Depends(get_db)
):
    store = await get_default_store(db)
    return await update_collection(db, store, collection_id, payload)


@router.delete("/collections/{collection_id}", status_code=204)
async def delete_listing_collection(collection_id: UUID, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    await delete_collection(db, store, collection_id)


@router.get("/theme", response_model=ThemeOut)
async def theme(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await get_admin_theme(db, store)


@router.put("/theme", response_model=ThemeOut)
async def save_theme(payload: ThemeIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await save_theme_draft(db, store, payload)


@router.post("/theme/publish", response_model=ThemeOut)
async def publish(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await publish_theme(db, store)


@router.get("/policies", response_model=list[PolicyOut])
async def policies(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_admin_policies(db, store)


@router.post("/policies", response_model=PolicyOut)
async def create_policy(payload: PolicyIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await save_policy(db, store, None, payload)


@router.put("/policies/{policy_id}", response_model=PolicyOut)
async def update_policy(policy_id: UUID, payload: PolicyIn, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await save_policy(db, store, policy_id, payload)


@router.delete("/policies/{policy_id}", status_code=204)
async def delete_policy_page(policy_id: UUID, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    await delete_policy(db, store, policy_id)


@router.get("/orders", response_model=list[OrderOut])
async def orders(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_orders(db, store)


@router.get("/integrations/delhivery/settings")
async def get_delhivery_settings(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await delhivery_settings(db, store)


@router.put("/integrations/delhivery/settings")
async def put_delhivery_settings(payload: DelhiverySettingsIn, db: AsyncSession = Depends(get_db)):
    """Pickup warehouse name, exactly as registered in Delhivery One."""
    store = await get_default_store(db)
    return await save_delhivery_settings(db, store, payload.pickup_location)


@router.post("/orders/{order_id}/shipments", response_model=OrderOut)
async def ship_order(order_id: UUID, db: AsyncSession = Depends(get_db)):
    """Manifest a paid order with Delhivery (creates the AWB and books a pickup)."""
    store = await get_default_store(db)
    return await create_shipment(db, store, order_id)


@router.get("/shipments/{fulfillment_id}/label")
async def shipment_label_pdf(fulfillment_id: UUID, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    filename, pdf = await shipment_label(db, store, fulfillment_id)
    return Response(
        pdf,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/shipments/{fulfillment_id}/refresh", response_model=FulfillmentOut)
async def shipment_refresh(fulfillment_id: UUID, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await refresh_tracking(db, store, fulfillment_id)


@router.post("/shipments/{fulfillment_id}/cancel", response_model=FulfillmentOut)
async def shipment_cancel(fulfillment_id: UUID, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await cancel_shipment(db, store, fulfillment_id)


@router.get("/inquiries", response_model=list[InquiryOut])
async def inquiries(status: InquiryStatus | None = None, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_inquiries(db, store, status)


@router.patch("/inquiries/{inquiry_id}", response_model=InquiryOut)
async def update_inquiry(
    inquiry_id: UUID, payload: InquiryStatusUpdate, db: AsyncSession = Depends(get_db)
):
    store = await get_default_store(db)
    return await update_inquiry_status(db, store, inquiry_id, payload.status)


@router.get("/newsletter", response_model=list[NewsletterSubscriberOut])
async def newsletter_subscribers(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    return await list_newsletter_subscribers(db, store)


@router.get("/integrations/providers")
async def providers():
    return available_providers()


@router.get("/integrations", response_model=list[IntegrationOut])
async def integrations(db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    result = await db.execute(
        select(StoreIntegration).where(StoreIntegration.store_id == store.id).order_by(StoreIntegration.kind)
    )
    return list(result.scalars())


@router.post("/integrations", response_model=IntegrationOut)
async def install_integration(payload: IntegrationInstall, db: AsyncSession = Depends(get_db)):
    store = await get_default_store(db)
    integration = StoreIntegration(
        id=uuid.uuid4(),
        store_id=store.id,
        provider_key=payload.provider_key,
        kind=payload.kind,
        status="active",
        config=payload.config,
        secret_ref=payload.secret_ref,
    )
    db.add(integration)
    await db.commit()
    await db.refresh(integration)
    return integration
