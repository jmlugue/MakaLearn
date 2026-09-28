-- New Auth users are not trusted application accounts yet. Public signup is
-- disabled, but this fail-safe keeps caller-controlled metadata from assigning
-- an application role or activating a profile if Auth creation is exposed.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, email, role, status)
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'name', pg_catalog.split_part(new.email, '@', 1)),
    new.email,
    'teacher'::public.user_role,
    'invited'::public.profile_status
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    updated_at = pg_catalog.now();

  return new;
end;
$$;

-- The existing auth.users trigger invokes this function internally. It must
-- not become an exposed RPC for public API roles.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
