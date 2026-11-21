create table public.store_inquiries (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  kind text not null check (kind in ('contact', 'bulk', 'corporate', 'planner', 'dealer', 'tracking', 'product')),
  name text not null,
  email text not null,
  phone text,
  topic text,
  message text not null,
  details jsonb not null default '{}'::jsonb,
  status text not null default 'new' check (status in ('new', 'in_progress', 'resolved')),
  source_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null references public.stores(id) on delete cascade,
  email text not null,
  source text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index store_inquiries_store_status_created_idx on public.store_inquiries(store_id, status, created_at desc);
create unique index newsletter_subscribers_store_email_idx on public.newsletter_subscribers(store_id, lower(email));

create trigger store_inquiries_set_updated_at before update on public.store_inquiries for each row execute function public.set_updated_at();
create trigger newsletter_subscribers_set_updated_at before update on public.newsletter_subscribers for each row execute function public.set_updated_at();

alter table public.store_inquiries enable row level security;
alter table public.newsletter_subscribers enable row level security;

-- No public policies: storefront submissions are written by the API, never directly by clients.
create policy "staff can manage store inquiries" on public.store_inquiries
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));

create policy "staff can manage newsletter subscribers" on public.newsletter_subscribers
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));
