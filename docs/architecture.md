# Architecture

## Tenancy

The schema supports one or more stores. GroovyDudz is seeded as the first store, but all catalog, order, staff, and integration records are scoped by `store_id`.

## Access Model

Supabase Auth owns identity. The `staff_members` table maps an auth user to a store and role:

- `owner`: complete access
- `admin`: catalog, orders, customers, integrations
- `catalog_manager`: products, categories, media, inventory
- `fulfillment`: orders and shipping
- `support`: orders, customers, notifications

The FastAPI backend validates Supabase JWTs and enforces permissions before admin actions. Supabase RLS also protects direct database access.

## Integrations

Integrations are modeled like Shopify apps:

- `integration_definitions`: available provider catalog
- `store_integrations`: installed providers for a store
- `webhook_events`: inbound provider events with idempotency

Business services depend on provider interfaces:

- email provider: Resend
- payment provider: PayU
- shipping provider: Delhivery

Future providers such as Shiprocket can be added by implementing the shipping interface and registering a new definition.

Secrets should be stored in AWS Secrets Manager, Supabase Vault, or environment variables. Database rows store provider state and non-secret config only.

## Order Flow

1. Storefront reads active products and variants.
2. Checkout creates a pending order.
3. Payment service signs a PayU hosted-checkout request; PayU posts the result back to the API.
4. The return handler and PayU webhook verify the hash, re-check with PayU, and mark payment success/failure idempotently.
5. Fulfillment service creates a Delhivery shipment after payment success.
6. Resend sends customer/admin notifications.

## AWS Usage

- S3 stores product images and downloadable assets.
- CloudFront fronts media for fast delivery.
- ECS/App Runner can host FastAPI.
- Amplify, S3/CloudFront, or Vercel can host frontend.
- Secrets Manager stores provider credentials.
