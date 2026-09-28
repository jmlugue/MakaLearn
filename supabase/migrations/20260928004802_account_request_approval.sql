-- Public visitors request teacher access without creating an Auth user. Only an
-- active admin may read or review these rows; the public POST route uses the
-- server-only service role to create pending requests.
create type public.account_request_status as enum ('pending', 'approved', 'rejected');

create table public.account_requests (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  status public.account_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by text references public.profiles(id) on delete set null,
  constraint account_requests_name_length check (char_length(name) between 2 and 100),
  constraint account_requests_name_trimmed check (name = btrim(name)),
  constraint account_requests_email_length check (char_length(email) between 3 and 254),
  constraint account_requests_email_normalized check (email = lower(btrim(email))),
  constraint account_requests_review_state check (
    (status = 'pending' and reviewed_at is null and reviewed_by is null)
    or (status in ('approved', 'rejected') and reviewed_at is not null and reviewed_by is not null)
  )
);

create unique index account_requests_pending_email_unique
on public.account_requests (lower(email))
where status = 'pending';

create index account_requests_status_created_at_idx
on public.account_requests (status, created_at desc);

alter table public.account_requests enable row level security;

-- New public-schema tables are moving to explicit Data API exposure. Keep anon
-- out entirely, expose only the operations the signed-in admin UI needs, and
-- retain service-role access for guarded server routes.
revoke all on table public.account_requests from anon, authenticated;
grant select, update on table public.account_requests to authenticated;
grant all on table public.account_requests to service_role;

create policy "Admins read account requests"
on public.account_requests for select to authenticated
using ((select private.current_user_role()) = 'admin');

create policy "Admins review account requests"
on public.account_requests for update to authenticated
using ((select private.current_user_role()) = 'admin')
with check ((select private.current_user_role()) = 'admin');
