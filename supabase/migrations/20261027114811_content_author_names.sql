-- Expose attribution only. Full profiles retain their existing self/admin RLS.
create or replace function private.content_author_names()
returns table (id text, name text)
language sql stable security definer set search_path = ''
as $$
  select p.id, p.name from public.profiles p
  where (select auth.uid()) is not null
    and (select private.current_user_role()) in ('teacher'::public.user_role, 'admin'::public.user_role)
$$;
revoke all on function private.content_author_names() from public, anon;
grant execute on function private.content_author_names() to authenticated;
create or replace function public.content_author_names()
returns table (id text, name text)
language sql stable security invoker set search_path = ''
as $$ select * from private.content_author_names() $$;
revoke all on function public.content_author_names() from public, anon;
grant execute on function public.content_author_names() to authenticated;
