create extension if not exists pgcrypto;

create table public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  domain text unique,
  currency text not null default 'INR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.staff_members (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'admin', 'catalog_manager', 'fulfillment', 'support')),
  status text not null default 'invited' check (status in ('invited', 'active', 'disabled')),
  permissions jsonb not null default '{}'::jsonb,
  invited_at timestamptz not null default now(),
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, user_id)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  auth_user_id uuid references auth.users(id) on delete set null,
  email text not null,
  phone text,
  first_name text,
  last_name text,
  accepts_marketing boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  parent_id uuid references public.categories(id) on delete set null,
  title text not null,
  slug text not null,
  description text,
  image_url text,
  position integer not null default 0,
  is_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  status text not null default 'draft' check (status in ('draft', 'active', 'archived')),
  vendor text,
  product_type text,
  seo jsonb not null default '{}'::jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, slug)
);

create table public.product_media (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  url text not null,
  alt_text text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null default 'Default',
  sku text,
  price numeric(12,2) not null check (price >= 0),
  compare_at_price numeric(12,2) check (compare_at_price is null or compare_at_price >= 0),
  inventory_quantity integer not null default 0 check (inventory_quantity >= 0),
  weight_grams integer check (weight_grams is null or weight_grams >= 0),
  options jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.product_categories (
  product_id uuid not null references public.products(id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (product_id, category_id)
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  customer_id uuid references public.customers(id) on delete set null,
  order_number text not null,
  email text not null,
  phone text,
  customer_name text not null,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'cancelled', 'closed')),
  payment_status text not null default 'pending' check (payment_status in ('pending', 'paid', 'failed', 'refunded', 'partially_refunded')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled', 'partial', 'fulfilled', 'returned')),
  subtotal numeric(12,2) not null check (subtotal >= 0),
  shipping_total numeric(12,2) not null default 0 check (shipping_total >= 0),
  tax_total numeric(12,2) not null default 0 check (tax_total >= 0),
  grand_total numeric(12,2) not null check (grand_total >= 0),
  currency text not null default 'INR',
  shipping_address jsonb not null,
  billing_address jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, order_number)
);

create table public.order_lines (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  title text not null,
  sku text,
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  line_total numeric(12,2) not null check (line_total >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  provider_payment_id text,
  provider_order_id text,
  status text not null default 'created',
  amount numeric(12,2) not null check (amount >= 0),
  currency text not null default 'INR',
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.fulfillments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null,
  status text not null default 'pending',
  tracking_number text,
  tracking_url text,
  label_url text,
  raw_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.integration_definitions (
  provider_key text primary key,
  kind text not null check (kind in ('email', 'payment', 'shipping', 'media', 'analytics')),
  display_name text not null,
  description text,
  config_schema jsonb not null default '{}'::jsonb,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.store_integrations (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  provider_key text not null references public.integration_definitions(provider_key),
  kind text not null check (kind in ('email', 'payment', 'shipping', 'media', 'analytics')),
  status text not null default 'active' check (status in ('active', 'disabled', 'error')),
  config jsonb not null default '{}'::jsonb,
  secret_ref text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (store_id, provider_key)
);

create table public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  store_id uuid references public.stores(id) on delete cascade,
  provider_key text not null,
  event_id text,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider_key, event_id)
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  subject_type text not null,
  subject_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index staff_members_store_id_idx on public.staff_members(store_id);
create index staff_members_user_id_idx on public.staff_members(user_id);
create index customers_store_email_idx on public.customers(store_id, email);
create index categories_store_position_idx on public.categories(store_id, position);
create index categories_parent_id_idx on public.categories(parent_id);
create index products_store_status_created_idx on public.products(store_id, status, created_at desc);
create index products_active_idx on public.products(store_id, created_at desc) where status = 'active';
create index product_media_product_id_idx on public.product_media(product_id);
create index product_variants_product_id_idx on public.product_variants(product_id);
create index product_variants_sku_idx on public.product_variants(sku) where sku is not null;
create index product_categories_category_id_idx on public.product_categories(category_id);
create index orders_store_created_idx on public.orders(store_id, created_at desc);
create index orders_customer_id_idx on public.orders(customer_id);
create index order_lines_order_id_idx on public.order_lines(order_id);
create index payments_order_id_idx on public.payments(order_id);
create index fulfillments_order_id_idx on public.fulfillments(order_id);
create index store_integrations_store_id_idx on public.store_integrations(store_id);
create index webhook_events_unprocessed_idx on public.webhook_events(created_at) where processed_at is null;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger stores_set_updated_at before update on public.stores for each row execute function public.set_updated_at();
create trigger staff_members_set_updated_at before update on public.staff_members for each row execute function public.set_updated_at();
create trigger customers_set_updated_at before update on public.customers for each row execute function public.set_updated_at();
create trigger categories_set_updated_at before update on public.categories for each row execute function public.set_updated_at();
create trigger products_set_updated_at before update on public.products for each row execute function public.set_updated_at();
create trigger product_media_set_updated_at before update on public.product_media for each row execute function public.set_updated_at();
create trigger product_variants_set_updated_at before update on public.product_variants for each row execute function public.set_updated_at();
create trigger orders_set_updated_at before update on public.orders for each row execute function public.set_updated_at();
create trigger order_lines_set_updated_at before update on public.order_lines for each row execute function public.set_updated_at();
create trigger payments_set_updated_at before update on public.payments for each row execute function public.set_updated_at();
create trigger fulfillments_set_updated_at before update on public.fulfillments for each row execute function public.set_updated_at();
create trigger integration_definitions_set_updated_at before update on public.integration_definitions for each row execute function public.set_updated_at();
create trigger store_integrations_set_updated_at before update on public.store_integrations for each row execute function public.set_updated_at();

create or replace function public.is_store_staff(target_store_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.store_id = target_store_id
      and sm.user_id = auth.uid()
      and sm.status = 'active'
  );
$$;

alter table public.stores enable row level security;
alter table public.staff_members enable row level security;
alter table public.customers enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_media enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_categories enable row level security;
alter table public.orders enable row level security;
alter table public.order_lines enable row level security;
alter table public.payments enable row level security;
alter table public.fulfillments enable row level security;
alter table public.integration_definitions enable row level security;
alter table public.store_integrations enable row level security;
alter table public.webhook_events enable row level security;
alter table public.audit_logs enable row level security;

create policy "public can read stores" on public.stores for select using (true);
create policy "staff can read staff" on public.staff_members for select using (public.is_store_staff(store_id));

create policy "public can read visible categories" on public.categories
  for select using (is_visible);
create policy "staff can manage categories" on public.categories
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));

create policy "public can read active products" on public.products
  for select using (status = 'active');
create policy "staff can manage products" on public.products
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));

create policy "public can read active product media" on public.product_media
  for select using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "staff can manage product media" on public.product_media
  for all using (exists (select 1 from public.products p where p.id = product_id and public.is_store_staff(p.store_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.is_store_staff(p.store_id)));

create policy "public can read active variants" on public.product_variants
  for select using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "staff can manage variants" on public.product_variants
  for all using (exists (select 1 from public.products p where p.id = product_id and public.is_store_staff(p.store_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.is_store_staff(p.store_id)));

create policy "public can read product categories" on public.product_categories
  for select using (exists (select 1 from public.products p where p.id = product_id and p.status = 'active'));
create policy "staff can manage product categories" on public.product_categories
  for all using (exists (select 1 from public.products p where p.id = product_id and public.is_store_staff(p.store_id)))
  with check (exists (select 1 from public.products p where p.id = product_id and public.is_store_staff(p.store_id)));

create policy "staff can manage customers" on public.customers
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));
create policy "customers can read own profile" on public.customers
  for select using (auth_user_id = auth.uid());

create policy "staff can manage orders" on public.orders
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));
create policy "customers can read own orders" on public.orders
  for select using (customer_id in (select id from public.customers where auth_user_id = auth.uid()));

create policy "staff can manage order lines" on public.order_lines
  for all using (exists (select 1 from public.orders o where o.id = order_id and public.is_store_staff(o.store_id)))
  with check (exists (select 1 from public.orders o where o.id = order_id and public.is_store_staff(o.store_id)));

create policy "staff can read payments" on public.payments
  for select using (exists (select 1 from public.orders o where o.id = order_id and public.is_store_staff(o.store_id)));
create policy "staff can manage fulfillments" on public.fulfillments
  for all using (exists (select 1 from public.orders o where o.id = order_id and public.is_store_staff(o.store_id)))
  with check (exists (select 1 from public.orders o where o.id = order_id and public.is_store_staff(o.store_id)));

create policy "public can read integration definitions" on public.integration_definitions
  for select using (is_enabled);
create policy "staff can manage store integrations" on public.store_integrations
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));

create policy "staff can read webhook events" on public.webhook_events
  for select using (store_id is not null and public.is_store_staff(store_id));
create policy "staff can read audit logs" on public.audit_logs
  for select using (public.is_store_staff(store_id));

insert into public.integration_definitions (provider_key, kind, display_name, description, config_schema)
values
  ('resend', 'email', 'Resend', 'Transactional email for order and staff notifications.', '{"required":["from_email"]}'::jsonb),
  ('razorpay', 'payment', 'Razorpay', 'UPI, cards, wallets, and netbanking payment collection.', '{"required":["key_id"]}'::jsonb),
  ('bluedart', 'shipping', 'BlueDart', 'Shipment creation, pincode serviceability, labels, and tracking.', '{"required":["customer_code","origin_area"]}'::jsonb)
on conflict (provider_key) do nothing;

insert into public.stores (name, slug, domain, currency)
values ('GroovyDudz', 'groovydudz', 'groovydudz.com', 'INR')
on conflict (slug) do nothing;
