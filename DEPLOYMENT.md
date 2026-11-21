# GroovyDudz deployment & manual checklist

Everything below the "Manual steps" heading still needs **you** to do it.

## What is live

| Site | URL | Vercel project | Deploys from |
|---|---|---|---|
| Storefront | https://groovydudz-store.vercel.app | `groovydudz-store` | `frontend/` (`npm run build` → `dist`) |
| Admin | https://groovydudz-admin.vercel.app | `groovydudz-admin` | `frontend/` (`npm run build:admin` → `dist-admin`) |
| API | https://groovydudz-api.vercel.app | `groovydudz-api` | `backend/` (FastAPI, region `dub1` = Dublin, next to the database) |
| Database / auth | Supabase project `mntnwncgoxtppaiqwygj` (org **GroovyDudz**, eu-west-1) | — | — |

Admin login: `groovydudz@gmail.com` + your 6-digit PIN.

Payments: **PayU LIVE** — every payment is real money. Shipping: **Delhivery LIVE**.

---

## Manual steps

### 1. PayU dashboard (required before taking orders)
1. **Webhook** — PayU Dashboard → Developers → Webhooks → add for **Payment success** and **Payment failure**:
   `https://groovydudz-api.vercel.app/webhooks/payu`
   (No secret needed — PayU signs webhooks with your merchant salt.)
2. **Website / domain** — make sure the storefront domain (`groovydudz-store.vercel.app`, or your custom domain later) is the registered website on your PayU account. PayU can block live transactions from unregistered sites.
3. **Test for real** — on the storefront buy the cheapest product and pay, then check:
   - you land on "Payment confirmed",
   - Admin → Orders shows it **paid**,
   - then **refund** it in PayU Dashboard → Transactions (refunds are done in PayU, not in the admin).
4. **Test a cancellation** — start checkout, click *Cancel* on the PayU page: you should land on "Payment cancelled", cart still there.

### 2. GitHub — payment reconcile every 15 minutes
Vercel Hobby only allows one cron per day (runs daily at 03:00 IST). The workflow `.github/workflows/reconcile-payments.yml` runs the same job every 15 min:
1. GitHub repo → Settings → Secrets and variables → Actions → **New repository secret**
   `CRON_SECRET` = the `CRON_SECRET` value in `backend/.env`.
2. Push the repo (the workflow only runs once it is on GitHub's default branch).
3. Actions tab → "Reconcile PayU payments" → **Run workflow** once; it should print `{"checked": …}`.

(Alternative: upgrade Vercel to Pro and change `backend/vercel.json` cron to `*/15 * * * *`.)

### 3. Delhivery
1. Admin → Integrations → Delhivery → **Pickup location** → enter the warehouse name *exactly* as in Delhivery One → Settings → Pickup Locations → Save. Until then "Ship via Delhivery" is blocked (PIN-code checks already work).
2. **Rotate the API token** (it was exposed during setup): Delhivery One → Settings → API Setup → regenerate, then update it (see "Changing a secret" below). Also regenerate the Delhivery One MCP client secret.

### 4. Rotate secrets that were shared during setup
Shared in chat / terminal, so rotate them when convenient:
- **Supabase database password** — Supabase → Project Settings → Database → Reset password. Then update `DATABASE_URL` (URL-encode `@` as `%40`) on Vercel `groovydudz-api` and in `backend/.env`.
- **Delhivery token** (above).
- **Resend API key** — the old one was committed in git history; create a new key in Resend and set `RESEND_API_KEY` (emails are not sent until this is set).
- **Admin PIN** — a 6-digit PIN is weak for an account that sees orders. Consider a longer password: Supabase → Authentication → Users → groovydudz@gmail.com → reset password.

### 5. Catalog clean-up (Admin)
- Two products have price **₹0** and cannot be bought until priced: "Astronaut Space Theme 5th Birthday Decoration Combo" and "GROOVYDUDZ Air Dry Clay Set". Admin → Products → set price.
- `seed.sql` added 4 sample products that duplicate real ones (e.g. "Astronaut Space Theme Decoration Combo - 50 Pcs"). Archive them in Admin → Products.
- Online Store → Customize → **Publish** a theme (until then the storefront uses the built-in default).
- Test orders created during setup (all cancelled / unpaid, safe to leave or delete): `GD-E4313B87`, `GD-467C3A29`, `GD-62601765`, `GD-773E44C1`.

### 6. Custom domains (when ready)
1. Vercel → each project → Settings → Domains: e.g. `groovydudz.com` (store), `admin.groovydudz.com` (admin), `api.groovydudz.com` (API). Add the DNS records Vercel shows.
2. Update env vars, then **redeploy all three**:
   - `groovydudz-api`: `API_HOST`, `STOREFRONT_URL`, `FRONTEND_ORIGIN` (store + admin origins, comma-separated)
   - `groovydudz-store`: `VITE_API_BASE_URL`
   - `groovydudz-admin`: `VITE_API_BASE_URL`, `VITE_STOREFRONT_URL`, `VITE_ADMIN_ORIGIN`
3. PayU: update the webhook URL and registered website.
4. Supabase → Authentication → URL Configuration: set Site URL to the admin domain.
5. GitHub: add repo variable `API_URL` = new API URL (used by the reconcile workflow).

---

## How payment fallbacks work

| What happens | What the system does | Customer sees |
|---|---|---|
| Pays successfully | PayU posts back → hash checked → re-confirmed with PayU's verify API → amount checked → order **paid**, stock reduced once | "Payment confirmed" |
| Clicks Cancel on PayU | Order **cancelled** (payment `cancelled`) | "Payment cancelled… cart is still here" |
| Card/UPI fails | Order payment **failed** | "Payment failed… try again" |
| Closes the tab / network drops after paying | PayU webhook settles it; the reconcile job (every 15 min via GitHub, daily via Vercel) also re-checks with PayU | Order becomes paid automatically |
| PayU's verify API is down when they return | Order stays **pending** (never wrongly failed) | "Still being confirmed… don't pay again" |
| Never pays (abandons) | Reconcile job expires it after 60 min as **abandoned** | — |
| Presses browser Back from PayU | Pay button resets (no stuck "Processing…") | Checkout form again |
| Tampered / fake callback | Rejected (hash mismatch) | "Couldn't confirm payment" |
| PayU repeats a webhook | Logged once; order state still saved | — |
| Late success after a failure | Upgraded to paid; a paid order is never downgraded | — |
| ₹0 product / undeliverable PIN | Checkout refused before payment | Clear error message |

**Customer says "money was debited but order failed":**
1. Their PayU transaction ID is the order number without the dash (`GD-773E44C1` → `GD773E44C1`). Search it in PayU Dashboard → Transactions.
2. Run the reconcile job now: GitHub → Actions → "Reconcile PayU payments" → Run workflow (or
   `curl -H "Authorization: Bearer $CRON_SECRET" https://groovydudz-api.vercel.app/jobs/reconcile-payments`).
3. If PayU shows success but the order is cancelled (e.g. paid after it was abandoned), the job upgrades it to paid. Otherwise refund from the PayU dashboard.

---

## Redeploying

Each project is deployed with the Vercel CLI from its folder (`vercel login` first if needed).

```bash
# API
cd backend && vercel deploy --prod

# Storefront and admin share frontend/, so link the folder to the right project first
cd frontend
vercel link --yes --project groovydudz-store && vercel deploy --prod
vercel link --yes --project groovydudz-admin && vercel deploy --prod
```

Optional: connect the GitHub repo in each Vercel project (Settings → Git) with Root Directory `backend` / `frontend` / `frontend` so pushes deploy automatically.

### Changing a secret / env var
Vercel → project → Settings → Environment Variables → edit (Production) → **redeploy** that project (env changes only apply to new deployments). Keep `backend/.env` in sync for local development.

### Logs
- API errors: Vercel → `groovydudz-api` → Logs (or `cd backend && vercel logs groovydudz-api.vercel.app`).
- Every PayU callback is stored in the `webhook_events` table (Supabase → Table Editor).

### Database changes
New SQL migrations go in `supabase/migrations/` and are run with `psql` against the session pooler
(`aws-0-eu-west-1.pooler.supabase.com:5432`, user `postgres.mntnwncgoxtppaiqwygj`), in order, each as one transaction.
