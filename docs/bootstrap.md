# Bootstrap

## 1. Supabase

Run `supabase/migrations/0001_initial_commerce.sql`, then `supabase/seed.sql`.

Create the first admin user in Supabase Auth, then mark that auth user as store owner:

```sql
insert into public.staff_members (store_id, user_id, role, status, accepted_at)
select s.id, '00000000-0000-0000-0000-000000000000'::uuid, 'owner', 'active', now()
from public.stores s
where s.slug = 'groovydudz'
on conflict (store_id, user_id)
do update set role = 'owner', status = 'active', accepted_at = now();
```

Replace the UUID with the Supabase Auth user id.

## 2. Backend Environment

Set every variable in `backend/.env.example`. For production, put secrets in AWS Secrets Manager or Supabase Vault and use `secret_ref` values in `store_integrations`.

Required for live checkout:

- `DATABASE_URL`
- `SUPABASE_URL`
- `SUPABASE_JWKS_URL`
- `RESEND_API_KEY`
- `STOREFRONT_URL`
- `PAYU_ENV`, `PAYU_MERCHANT_KEY`, `PAYU_MERCHANT_SALT`
- `DELHIVERY_API_TOKEN`, `DELHIVERY_PICKUP_LOCATION` and the other `DELHIVERY_*` settings (see `backend/.env.example`)

## 3. Frontend Environment

Set:

- `VITE_API_BASE_URL`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 4. Webhooks

In the PayU dashboard (Developers → Webhooks), add a webhook for successful and failed payments:

```text
https://api.groovydudz.com/webhooks/payu
```

PayU signs webhooks with the same merchant salt, so no extra secret is needed.
