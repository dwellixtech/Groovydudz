-- Make the GroovyDudz admin account (created in Supabase Auth) the store owner.
-- Run after migrations; safe to re-run.
insert into public.staff_members (store_id, user_id, role, status, accepted_at)
select s.id, u.id, 'owner', 'active', now()
from public.stores s
join auth.users u on lower(u.email) = 'groovydudz@gmail.com'
where s.slug = 'groovydudz'
on conflict (store_id, user_id) do update
  set role = 'owner', status = 'active', accepted_at = coalesce(public.staff_members.accepted_at, now());
