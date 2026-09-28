-- Teachers collaborate on shared teaching content. Admins can inspect content
-- and audit activity, but cannot create, edit, upload, or delete teaching content.

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.profiles
  where id = (select auth.uid())::text
    and status = 'active'
$$;

revoke all on function private.current_user_role() from public;
grant execute on function private.current_user_role() to authenticated;

-- Trigger-only functions should not be exposed as RPC endpoints.
revoke execute on function public.handle_new_user() from public, anon, authenticated;
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null then
    execute 'revoke execute on function public.rls_auto_enable() from public, anon, authenticated';
  end if;
end $$;

-- Bring databases that predate the latest local migrations to the current shape.
alter table public.lessons
  add column if not exists related_activity_id text
  references public.activities(id) on delete set null;

alter table public.user_settings
  add column if not exists guide_mode boolean not null default true,
  add column if not exists guide_seen text[] not null default '{}';

-- Learner profile photos were removed from the product. No uploaded objects or
-- media rows existed when this migration was prepared.
alter table public.learners
  drop column if exists profile_photo_url;

delete from public.media_assets
where type::text = 'learner-photo';

-- Existing admin-owned templates become immutable system defaults. Each teacher
-- can then keep a separate override for the same activity type and material.
alter table public.activity_prompt_templates
  add column if not exists is_default boolean not null default false;

update public.activity_prompt_templates as template
set is_default = true
where exists (
  select 1
  from public.profiles
  where profiles.id = template.created_by
    and profiles.role = 'admin'
);

alter table public.activity_prompt_templates
  drop constraint if exists activity_prompt_templates_activity_type_learning_item_id_key;
drop index if exists public.activity_prompt_templates_activity_type_learning_item_id_unique;
create unique index if not exists activity_prompt_templates_creator_type_item_unique
  on public.activity_prompt_templates(created_by, activity_type, learning_item_id);

-- These were duplicated by the compatibility migration.
drop index if exists public.activity_prompt_generations_version_unique;

-- Shared rows may be edited by a different teacher, but their original creator
-- must remain unchanged.
create or replace function private.preserve_created_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.created_by is distinct from old.created_by then
    raise exception 'created_by cannot be changed';
  end if;
  return new;
end;
$$;

create or replace function private.preserve_uploaded_by()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.uploaded_by is distinct from old.uploaded_by then
    raise exception 'uploaded_by cannot be changed';
  end if;
  return new;
end;
$$;

drop trigger if exists preserve_categories_creator on public.categories;
create trigger preserve_categories_creator before update on public.categories
for each row execute function private.preserve_created_by();

drop trigger if exists preserve_learning_items_creator on public.learning_items;
create trigger preserve_learning_items_creator before update on public.learning_items
for each row execute function private.preserve_created_by();

drop trigger if exists preserve_lessons_creator on public.lessons;
create trigger preserve_lessons_creator before update on public.lessons
for each row execute function private.preserve_created_by();

drop trigger if exists preserve_activities_creator on public.activities;
create trigger preserve_activities_creator before update on public.activities
for each row execute function private.preserve_created_by();

drop trigger if exists preserve_prompt_templates_creator on public.activity_prompt_templates;
create trigger preserve_prompt_templates_creator before update on public.activity_prompt_templates
for each row execute function private.preserve_created_by();

drop trigger if exists preserve_media_uploader on public.media_assets;
create trigger preserve_media_uploader before update on public.media_assets
for each row execute function private.preserve_uploaded_by();

-- Replace broad FOR ALL policies with one policy per action. This avoids the
-- accidental SELECT access that a permissive FOR ALL policy also grants.
drop policy if exists "Authenticated read categories" on public.categories;
drop policy if exists "Role-aware write categories" on public.categories;
create policy "Active users read categories" on public.categories for select to authenticated
using ((select private.current_user_role()) in ('admin', 'teacher'));
create policy "Teachers insert categories" on public.categories for insert to authenticated
with check ((select private.current_user_role()) = 'teacher' and created_by = (select auth.uid())::text);
create policy "Teachers update shared categories" on public.categories for update to authenticated
using ((select private.current_user_role()) = 'teacher')
with check ((select private.current_user_role()) = 'teacher');
create policy "Teachers delete shared categories" on public.categories for delete to authenticated
using ((select private.current_user_role()) = 'teacher');

drop policy if exists "Authenticated read learning items" on public.learning_items;
drop policy if exists "Role-aware write learning items" on public.learning_items;
create policy "Active users read learning items" on public.learning_items for select to authenticated
using ((select private.current_user_role()) in ('admin', 'teacher'));
create policy "Teachers insert learning items" on public.learning_items for insert to authenticated
with check ((select private.current_user_role()) = 'teacher' and created_by = (select auth.uid())::text);
create policy "Teachers update shared learning items" on public.learning_items for update to authenticated
using ((select private.current_user_role()) = 'teacher')
with check ((select private.current_user_role()) = 'teacher');
create policy "Teachers delete shared learning items" on public.learning_items for delete to authenticated
using ((select private.current_user_role()) = 'teacher');

drop policy if exists "Authenticated read media assets" on public.media_assets;
drop policy if exists "Role-aware write media assets" on public.media_assets;
create policy "Active users read media assets" on public.media_assets for select to authenticated
using ((select private.current_user_role()) in ('admin', 'teacher'));
create policy "Teachers insert media assets" on public.media_assets for insert to authenticated
with check ((select private.current_user_role()) = 'teacher' and uploaded_by = (select auth.uid())::text);
create policy "Teachers update shared media assets" on public.media_assets for update to authenticated
using ((select private.current_user_role()) = 'teacher')
with check ((select private.current_user_role()) = 'teacher');
create policy "Teachers delete shared media assets" on public.media_assets for delete to authenticated
using ((select private.current_user_role()) = 'teacher');

drop policy if exists "Authenticated read lessons" on public.lessons;
drop policy if exists "Role-aware write lessons" on public.lessons;
create policy "Role-aware read lessons" on public.lessons for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and (visibility = 'shared' or created_by = (select auth.uid())::text)
  )
);
create policy "Teachers insert own lessons" on public.lessons for insert to authenticated
with check ((select private.current_user_role()) = 'teacher' and created_by = (select auth.uid())::text);
create policy "Teachers update available lessons" on public.lessons for update to authenticated
using (
  (select private.current_user_role()) = 'teacher'
  and (visibility = 'shared' or created_by = (select auth.uid())::text)
)
with check (
  (select private.current_user_role()) = 'teacher'
  and (visibility = 'shared' or created_by = (select auth.uid())::text)
);
create policy "Teachers delete available lessons" on public.lessons for delete to authenticated
using (
  (select private.current_user_role()) = 'teacher'
  and (visibility = 'shared' or created_by = (select auth.uid())::text)
);

drop policy if exists "Authenticated read lesson items" on public.lesson_items;
drop policy if exists "Authenticated write lesson items" on public.lesson_items;
create policy "Role-aware read lesson items" on public.lesson_items for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or exists (
    select 1 from public.lessons
    where lessons.id = lesson_items.lesson_id
      and (select private.current_user_role()) = 'teacher'
      and (lessons.visibility = 'shared' or lessons.created_by = (select auth.uid())::text)
  )
);
create policy "Teachers insert available lesson items" on public.lesson_items for insert to authenticated
with check (exists (
  select 1 from public.lessons
  where lessons.id = lesson_items.lesson_id
    and (select private.current_user_role()) = 'teacher'
    and (lessons.visibility = 'shared' or lessons.created_by = (select auth.uid())::text)
));
create policy "Teachers update available lesson items" on public.lesson_items for update to authenticated
using (exists (
  select 1 from public.lessons
  where lessons.id = lesson_items.lesson_id
    and (select private.current_user_role()) = 'teacher'
    and (lessons.visibility = 'shared' or lessons.created_by = (select auth.uid())::text)
))
with check (exists (
  select 1 from public.lessons
  where lessons.id = lesson_items.lesson_id
    and (select private.current_user_role()) = 'teacher'
    and (lessons.visibility = 'shared' or lessons.created_by = (select auth.uid())::text)
));
create policy "Teachers delete available lesson items" on public.lesson_items for delete to authenticated
using (exists (
  select 1 from public.lessons
  where lessons.id = lesson_items.lesson_id
    and (select private.current_user_role()) = 'teacher'
    and (lessons.visibility = 'shared' or lessons.created_by = (select auth.uid())::text)
));

drop policy if exists "Authenticated read activities" on public.activities;
drop policy if exists "Role-aware write activities" on public.activities;
drop policy if exists "Role-aware read activities" on public.activities;
drop policy if exists "Teachers insert own activities" on public.activities;
drop policy if exists "Teachers update available activities" on public.activities;
drop policy if exists "Teachers delete available activities" on public.activities;
create policy "Role-aware read activities" on public.activities for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and (visibility = 'shared' or created_by = (select auth.uid())::text)
  )
);
create policy "Teachers insert own activities" on public.activities for insert to authenticated
with check ((select private.current_user_role()) = 'teacher' and created_by = (select auth.uid())::text);
create policy "Teachers update available activities" on public.activities for update to authenticated
using (
  (select private.current_user_role()) = 'teacher'
  and (visibility = 'shared' or created_by = (select auth.uid())::text)
)
with check (
  (select private.current_user_role()) = 'teacher'
  and (visibility = 'shared' or created_by = (select auth.uid())::text)
);
create policy "Teachers delete available activities" on public.activities for delete to authenticated
using (
  (select private.current_user_role()) = 'teacher'
  and (visibility = 'shared' or created_by = (select auth.uid())::text)
);

drop policy if exists "Authenticated read activity items" on public.activity_items;
drop policy if exists "Authenticated write activity items" on public.activity_items;
drop policy if exists "Role-aware read activity items" on public.activity_items;
drop policy if exists "Teachers insert available activity items" on public.activity_items;
drop policy if exists "Teachers update available activity items" on public.activity_items;
drop policy if exists "Teachers delete available activity items" on public.activity_items;
create policy "Role-aware read activity items" on public.activity_items for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or exists (
    select 1 from public.activities
    where activities.id = activity_items.activity_id
      and (select private.current_user_role()) = 'teacher'
      and (activities.visibility = 'shared' or activities.created_by = (select auth.uid())::text)
  )
);
create policy "Teachers insert available activity items" on public.activity_items for insert to authenticated
with check (exists (
  select 1 from public.activities
  where activities.id = activity_items.activity_id
    and (select private.current_user_role()) = 'teacher'
    and (activities.visibility = 'shared' or activities.created_by = (select auth.uid())::text)
));
create policy "Teachers update available activity items" on public.activity_items for update to authenticated
using (exists (
  select 1 from public.activities
  where activities.id = activity_items.activity_id
    and (select private.current_user_role()) = 'teacher'
    and (activities.visibility = 'shared' or activities.created_by = (select auth.uid())::text)
))
with check (exists (
  select 1 from public.activities
  where activities.id = activity_items.activity_id
    and (select private.current_user_role()) = 'teacher'
    and (activities.visibility = 'shared' or activities.created_by = (select auth.uid())::text)
));
create policy "Teachers delete available activity items" on public.activity_items for delete to authenticated
using (exists (
  select 1 from public.activities
  where activities.id = activity_items.activity_id
    and (select private.current_user_role()) = 'teacher'
    and (activities.visibility = 'shared' or activities.created_by = (select auth.uid())::text)
));

-- Teachers inherit an admin-seeded default question, then save only their own
-- override. One teacher never overwrites another teacher's reusable question.
drop policy if exists "Authenticated read prompt templates" on public.activity_prompt_templates;
drop policy if exists "Role-aware write prompt templates" on public.activity_prompt_templates;
create policy "Users read available prompt templates" on public.activity_prompt_templates for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and (is_default or created_by = (select auth.uid())::text)
  )
);
create policy "Teachers insert own prompt templates" on public.activity_prompt_templates for insert to authenticated
with check (
  (select private.current_user_role()) = 'teacher'
  and created_by = (select auth.uid())::text
  and not is_default
);
create policy "Teachers update own prompt templates" on public.activity_prompt_templates for update to authenticated
using (
  (select private.current_user_role()) = 'teacher'
  and created_by = (select auth.uid())::text
  and not is_default
)
with check (
  (select private.current_user_role()) = 'teacher'
  and created_by = (select auth.uid())::text
  and not is_default
);
create policy "Teachers delete own prompt templates" on public.activity_prompt_templates for delete to authenticated
using (
  (select private.current_user_role()) = 'teacher'
  and created_by = (select auth.uid())::text
  and not is_default
);

drop policy if exists "Authenticated read AI prompt generations" on public.activity_prompt_generations;
drop policy if exists "Authenticated insert own AI prompt generations" on public.activity_prompt_generations;
create policy "Active users read AI prompt generations" on public.activity_prompt_generations for select to authenticated
using ((select private.current_user_role()) in ('admin', 'teacher'));
create policy "Teachers insert own AI prompt generations" on public.activity_prompt_generations for insert to authenticated
with check (
  (select private.current_user_role()) = 'teacher'
  and created_by = (select auth.uid())::text
);

-- Admins can view teaching media. Only teachers may add, replace, or delete it.
drop policy if exists "Authenticated read MakaLearn media" on storage.objects;
drop policy if exists "Authenticated upload MakaLearn media" on storage.objects;
drop policy if exists "Authenticated update MakaLearn media" on storage.objects;
drop policy if exists "Authenticated delete MakaLearn media" on storage.objects;
drop policy if exists "Active users read MakaLearn media" on storage.objects;
drop policy if exists "Teachers upload shared MakaLearn media" on storage.objects;
drop policy if exists "Teachers update shared MakaLearn media" on storage.objects;
drop policy if exists "Teachers delete shared MakaLearn media" on storage.objects;

create policy "Active users read MakaLearn media" on storage.objects for select to authenticated
using (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) in ('admin', 'teacher')
);
create policy "Teachers upload shared MakaLearn media" on storage.objects for insert to authenticated
with check (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
);
create policy "Teachers update shared MakaLearn media" on storage.objects for update to authenticated
using (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
)
with check (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
);
create policy "Teachers delete shared MakaLearn media" on storage.objects for delete to authenticated
using (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
);
