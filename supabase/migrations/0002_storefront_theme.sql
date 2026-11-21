create table public.store_themes (
  id uuid primary key default gen_random_uuid(),
  store_id uuid not null unique references public.stores(id) on delete cascade,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger store_themes_set_updated_at before update on public.store_themes for each row execute function public.set_updated_at();

alter table public.store_themes enable row level security;

-- Storefront reads the published theme through the API, so there is no public policy.
create policy "staff can manage store themes" on public.store_themes
  for all using (public.is_store_staff(store_id)) with check (public.is_store_staff(store_id));

create or replace function public.is_active_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.staff_members sm
    where sm.user_id = auth.uid()
      and sm.status = 'active'
  );
$$;

-- Public bucket: objects are served by public URL without a select policy.
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "staff can read media objects" on storage.objects
  for select to authenticated using (bucket_id = 'media' and public.is_active_staff());
create policy "staff can upload media objects" on storage.objects
  for insert to authenticated with check (bucket_id = 'media' and public.is_active_staff());
create policy "staff can update media objects" on storage.objects
  for update to authenticated using (bucket_id = 'media' and public.is_active_staff())
  with check (bucket_id = 'media' and public.is_active_staff());
create policy "staff can delete media objects" on storage.objects
  for delete to authenticated using (bucket_id = 'media' and public.is_active_staff());
