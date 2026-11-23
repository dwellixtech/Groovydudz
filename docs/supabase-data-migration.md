# Supabase Data Recovery and Manual Migration

Use this when the old Supabase organization/project is blocked or when moving GroovyDudz data into the dedicated Supabase project.

## First decision

1. If the old project is still visible in Supabase Dashboard, use Supabase's restore/clone flow when available. It is the cleanest path because it can copy the database, auth data, roles, permissions, and indexes.
2. If Dashboard access is blocked but the old database connection string still works, export with `supabase db dump` or `pg_dump`, then restore into the new project with `psql`.
3. If both Dashboard and database access are blocked, you cannot manually extract the data from this repo. Open a Supabase support request and ask for either temporary access, a downloadable backup, or a project transfer/export.
4. If the old project was deleted, Supabase treats deletion as permanent. Recovering it is not a normal manual option.

## What this app needs

The minimum useful data is in `public` tables: products, variants, media metadata, collections, themes, policies, orders, payments, fulfillments, staff members, integrations, inquiries, and subscribers.

Also copy separately:

- Supabase Auth users, especially the admin account. A normal `supabase db dump` excludes Supabase-managed schemas such as `auth` and `storage`, so restore/clone or dashboard backups are better if you need existing auth users.
- Storage files. Database backups only contain storage metadata, not the actual uploaded objects.
- Project settings: Site URL, redirect URLs, providers, JWT settings, storage bucket config, Realtime settings, webhooks, and Edge Functions if any.
- Secrets: database password, anon/service role keys, PayU, Delhivery, Resend. Rotate secrets rather than copying exposed ones.

## Manual logical export

Run this from a safe local machine. Do not commit generated dumps.

```bash
mkdir -p supabase/backups
export OLD_DB_URL='postgresql://...old...'
export NEW_DB_URL='postgresql://...new...'

supabase db dump --remote="$OLD_DB_URL" --schema public -f supabase/backups/old-public-schema.sql
supabase db dump --remote="$OLD_DB_URL" --schema public --data-only --use-copy -f supabase/backups/old-public-data.sql
```

If the new GroovyDudz project already has the migrations applied, restore only the data:

```bash
psql --single-transaction --variable ON_ERROR_STOP=1 --file supabase/backups/old-public-data.sql --dbname "$NEW_DB_URL"
```

If the new project is empty and should match the old schema exactly, restore schema first and then data:

```bash
psql --single-transaction --variable ON_ERROR_STOP=1 --file supabase/backups/old-public-schema.sql --file supabase/backups/old-public-data.sql --dbname "$NEW_DB_URL"
```

## Dashboard backup restore

If Supabase gives you a `.backup` or `.backup.gz` file:

```bash
gunzip backup_name.backup.gz
psql -d "$NEW_DB_URL" -f backup_name.backup
```

Some "already exists" errors can happen on a fresh Supabase project because default Supabase schemas already exist. If restore stops before loading GroovyDudz `public` data, ask Supabase support for a clean logical export or restore into a newly created target project.

## Storage objects

After restoring database metadata, upload the actual files into the matching buckets in the new project:

```bash
supabase login
supabase link --project-ref NEW_PROJECT_REF
supabase storage cp /path/to/downloaded/media ss://media -r --experimental --remote
```

Repeat for each bucket.

## After import

1. Recreate or verify the admin Auth user.
2. Recreate `staff_members` for that Auth user if needed.
3. Recreate storage buckets and policies if the restore did not include them.
4. Update Vercel env vars to the new Supabase URL, anon key, JWKS URL, and database URL.
5. Redeploy API, storefront, and admin.
6. Test Admin login, product images, checkout, PayU return URL, PayU webhook, and Delhivery shipping.
