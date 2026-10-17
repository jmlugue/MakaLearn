-- Canonical Collection API without breaking older deployments' table writes/upserts.
-- The two legacy backing tables remain until every deployed bundle uses this API.
alter type public.lesson_source rename to collection_source;
create view public.collections with (security_invoker = true) as
select id, title, objective, instructions, activity_type, estimated_duration,
  notes, source, visibility, created_by, created_at, updated_at, related_activity_id
from public.lessons;
create view public.collection_items with (security_invoker = true) as
select lesson_id as collection_id, learning_item_id, position from public.lesson_items;
revoke all on public.collections, public.collection_items from public, anon, authenticated;
grant select, insert, update, delete on public.collections, public.collection_items
  to authenticated, service_role;
comment on table public.lessons is 'Legacy backing table for the collections API; retained for deployed clients.';
comment on table public.lesson_items is 'Legacy backing table for collection_items; retained for deployed clients and ON CONFLICT writes.';
comment on view public.collections is 'Canonical Collection endpoint. Invoker permissions enforce backing-table RLS.';
comment on view public.collection_items is 'Canonical ordered collection materials. Invoker permissions enforce backing-table RLS.';

-- PostgREST upsert cannot infer unique constraints through a view. Keep the operation
-- atomic in an invoker function; permissions, active-role checks and RLS still apply.
create function public.upsert_collection_items(items jsonb)
returns void language plpgsql security invoker set search_path = '' as $$
begin
  if (select private.current_user_role()) is distinct from 'teacher'::public.user_role then
    raise exception 'Only active teachers can change collections' using errcode = '42501';
  end if;
  if jsonb_typeof(items) is distinct from 'array' then
    raise exception 'Collection items must be an array' using errcode = '22023';
  end if;
  insert into public.lesson_items (lesson_id, learning_item_id, position)
  select x.collection_id, x.learning_item_id, x.position
  from jsonb_to_recordset(items) as x(collection_id text, learning_item_id text, position integer)
  on conflict (lesson_id, learning_item_id) do update set position = excluded.position;
end;
$$;
revoke all on function public.upsert_collection_items(jsonb) from public, anon;
grant execute on function public.upsert_collection_items(jsonb) to authenticated, service_role;
notify pgrst, 'reload schema';
