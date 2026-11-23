# GroovyDudz Commerce Platform

Production-oriented storefront and admin platform for GroovyDudz.

**Deployment, live URLs and the manual setup checklist: see [DEPLOYMENT.md](DEPLOYMENT.md).**

Current production targets use separate deployments for the storefront, admin portal and API.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS
- Backend: FastAPI, SQLAlchemy async, Pydantic
- Database/Auth: Supabase Postgres + Supabase Auth
- Email: Resend integration provider
- Payments: PayU (hosted checkout)
- Shipping: Delhivery
- Media: AWS S3-compatible storage abstraction

## Structure

```text
frontend/          React storefront and admin portal
backend/           FastAPI API, services, integration adapters
supabase/          SQL migrations and seed data
docs/              Architecture and deployment notes
```

## Local Setup

1. Create Supabase project, run migrations in `supabase/migrations` (in order), then `supabase/seed.sql` and `supabase/seed_catalog.sql` (the real GroovyDudz catalog: 63 products, 11 collections).
2. Copy environment templates:

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

3. Install and run backend:

```bash
cd backend
uv venv
uv pip install -e ".[dev]"
uvicorn app.main:app --reload --port 8000
```

4. Install and run frontend:

```bash
cd frontend
npm install
npm run dev
```

The storefront runs at http://localhost:5173. The admin is a separate site: run `npm run dev:admin` (http://localhost:5174). Supabase and API environment variables are required; missing live configuration is shown as an error.

## Admin deployment

The admin panel lives in `frontend/src/admin` and is always deployed as its own site (the storefront build does not include it):

```bash
cd frontend
npm run dev:admin
npm run build:admin
```

The standalone build writes to `frontend/dist-admin` and serves the admin at `/`. For production, set `VITE_STOREFRONT_URL` to the storefront origin so “View store” links and thumbnails point to the customer site.

Docker can build either deployment from the same `frontend/Dockerfile`:

```bash
docker build -t groovydudz-storefront frontend
docker build --build-arg BUILD_SCRIPT=build:admin --build-arg DIST_DIR=dist-admin -t groovydudz-admin frontend
```

## PayU checkout

Checkout uses PayU India hosted checkout:

- Frontend posts cart and address details to `POST /checkout`.
- Backend creates a pending order, signs a PayU payment request (SHA-512 hash with the merchant salt) and returns the form fields.
- Frontend POSTs those fields to PayU (`test.payu.in` or `secure.payu.in`); the shopper pays on PayU's page.
- PayU POSTs the result to `POST /checkout/payu/return`. The backend checks the reverse hash, re-confirms the transaction with PayU's `verify_payment` API, checks the amount, marks the order paid, decrements inventory once and redirects to `/checkout?order=…&payment=…`.
- Configure the PayU webhook URL as `/webhooks/payu` (success and failure) to catch payments whose browser redirect never arrived. Events are processed idempotently.

```bash
# backend/.env
API_HOST=https://api.groovydudz.com   # PayU posts back here
STOREFRONT_URL=https://groovydudz.com  # shopper lands here afterwards
PAYU_ENV=test                              # or production
PAYU_MERCHANT_KEY=...
PAYU_MERCHANT_SALT=...
```

## Delhivery shipping

- `GET /public/serviceability/{pincode}` checks prepaid delivery to a PIN code; checkout blocks PIN codes Delhivery can't serve (and allows checkout if Delhivery is down).
- Admin → Orders → **Ship via Delhivery** on a paid order manifests it (creates the AWB) against `DELHIVERY_PICKUP_LOCATION` and requests a pickup for the next working day. The row then offers **Label** (packing slip PDF), **Track** and **Cancel** (before pickup).
- Tracking numbers appear on the storefront Track Your Order page.

```bash
# backend/.env
DELHIVERY_API_TOKEN=...                 # Delhivery One → Settings → API Setup
DELHIVERY_PICKUP_LOCATION=...           # warehouse name exactly as registered in Delhivery One
DELHIVERY_BASE_URL=https://track.delhivery.com   # staging: https://staging-express.delhivery.com
```

## Customizing the storefront

Admin → Online Store → Customize opens a Shopify-style theme editor:

- Homepage is a list of sections (slideshow, image banner, icons with text, scrolling text, party divider, collection list, featured collection, image with text, rich text, testimonials, email signup). Add, reorder (drag), hide, duplicate and edit them with a live desktop/mobile preview.
- Header (logo, announcement bar, menu), footer (link columns, socials) and theme settings (colors, heading font) are edited in the same place.
- Changes are saved as a draft and go live on **Publish** (`store_themes.draft` → `store_themes.published`).
- Section types and their fields are declared in `frontend/src/types/theme.ts`; renderers live in `frontend/src/storefront/sections.tsx`.
- Image uploads go to the Supabase Storage `media` bucket (created by migration 0002).

## Customer forms

- Contact Us and the business pages (bulk, corporate, event planners, dealers) save enquiries to `store_inquiries`; the footer and homepage signup save to `newsletter_subscribers` (migration 0004). Staff read them in Admin → Inbox (subscribers export as CSV).
- Track Your Order looks up an order by order number + checkout email (`POST /public/orders/track`).
- Free-shipping threshold (₹499) and fee (₹49) live in `backend/app/services/orders.py` and `frontend/src/lib/shipping.ts`; keep them in sync.

Admin → Policies manages storefront policy pages:

- Shipping, return/refund, privacy, terms and cancellation pages are stored in `store_policies`.
- The storefront serves them at `/pages/{slug}` and falls back to built-in defaults if policy records are missing.
- Run migration `supabase/migrations/0003_store_policies.sql` before using policy editing in live mode.

## Notes

- The backend is the source of truth for admin and checkout operations.
- Supabase RLS policies are included for direct client-safe reads and admin isolation.
- Provider implementations are replaceable through the integration registry. Adding Shiprocket later should require a new provider adapter plus an integration definition, not changes to orders or checkout.
