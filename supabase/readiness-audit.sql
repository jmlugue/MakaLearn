-- Read-only inventory. Run using an authorized administrative SQL connection.
-- This is an audit, NOT a migration or a list of objects approved for deletion.
begin transaction read only;

-- Exact counts, including empty compatibility views used by old deployments.
select 'profiles' as table_name, count(*) as row_count from public.profiles
union all select 'categories', count(*) from public.categories
union all select 'learning_items', count(*) from public.learning_items
union all select 'media_assets', count(*) from public.media_assets
union all select 'lessons', count(*) from public.lessons
union all select 'lesson_items', count(*) from public.lesson_items
union all select 'activities', count(*) from public.activities
union all select 'activity_items', count(*) from public.activity_items
union all select 'activity_results', count(*) from public.activity_results
union all select 'audit_logs', count(*) from public.audit_logs
union all select 'activity_prompt_templates', count(*) from public.activity_prompt_templates
union all select 'activity_prompt_generations', count(*) from public.activity_prompt_generations
union all select 'ai_usage_events', count(*) from public.ai_usage_events
union all select 'user_settings', count(*) from public.user_settings
union all select 'account_requests', count(*) from public.account_requests
union all select 'learners', count(*) from public.learners
union all select 'practice_attempts', count(*) from public.practice_attempts;

select 'collections' as api_name, count(*) from public.collections
union all select 'collection_items', count(*) from public.collection_items;
select c.relname as view_name, c.reloptions from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'v' order by c.relname;

select c.relname as table_name, c.relrowsecurity as rls_enabled
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r' order by c.relname;

select table_name, column_name, udt_name, is_nullable, column_default
from information_schema.columns where table_schema = 'public'
order by table_name, ordinal_position;

select * from pg_policies where schemaname in ('public', 'storage')
order by schemaname, tablename, policyname;

select table_name, grantee, privilege_type from information_schema.role_table_grants
where table_schema = 'public' and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

select n.nspname as schema_name, p.proname, p.prosecdef as security_definer,
  p.proacl, pg_get_functiondef(p.oid) as definition
from pg_proc p join pg_namespace n on n.oid = p.pronamespace
where n.nspname in ('public', 'private') and p.prokind = 'f';

select conrelid::regclass::text as table_name, conname, pg_get_constraintdef(oid)
from pg_constraint
where confrelid in ('public.learners'::regclass, 'public.practice_attempts'::regclass,
  'public.lessons'::regclass);

-- Column counts alone do not prove that a type has no other dependencies.
select t.typname, d.classid::regclass::text as dependent_catalog,
  pg_describe_object(d.classid, d.objid, d.objsubid) as dependent_object
from pg_type t join pg_depend d on d.refclassid = 'pg_type'::regclass and d.refobjid = t.oid
where t.typnamespace = 'public'::regnamespace
  and t.typname in ('practice_status', 'ai_usage_status');

select type, count(*) from public.activities group by type;
select coalesce(answers->>'source', 'legacy') as source, count(*),
  min(created_at) as first_record, max(created_at) as last_record
from public.activity_results group by answers->>'source';
select source, prompt_template_version, count(*)
from public.activity_prompt_generations group by source, prompt_template_version;
select source, is_default, count(*) from public.activity_prompt_templates group by source, is_default;
select target_type, count(*) from public.audit_logs group by target_type;

select b.id, b.public, b.file_size_limit, b.allowed_mime_types,
  (select count(*) from storage.objects o where o.bucket_id = b.id) as object_count
from storage.buckets b order by b.id;

select count(*) as media_records_without_objects
from public.media_assets m left join storage.objects o
  on o.bucket_id = m.bucket::text and o.name = m.storage_path where o.id is null;

-- Inventory candidates only. A direct URL reference can exist without a Media record.
select o.bucket_id, o.name,
  exists (select 1 from public.learning_items l where
    right(l.symbol_image_url, length(o.name) + 1) = '/' || o.name or
    right(l.activity_image_url, length(o.name) + 1) = '/' || o.name or
    right(l.gesture_media_url, length(o.name) + 1) = '/' || o.name or
    right(l.audio_url, length(o.name) + 1) = '/' || o.name
  ) as directly_referenced_by_material
from storage.objects o left join public.media_assets m
  on o.bucket_id = m.bucket::text and o.name = m.storage_path
where m.id is null order by o.bucket_id, o.name;
-- URL-encoded filenames and external consumers require an additional check before removal.

select count(*) as profiles_without_auth from public.profiles p
left join auth.users u on p.id = u.id::text where u.id is null;
select count(*) as auth_without_profiles from auth.users u
left join public.profiles p on p.id = u.id::text where p.id is null;

select version, name from supabase_migrations.schema_migrations order by version;
commit;
