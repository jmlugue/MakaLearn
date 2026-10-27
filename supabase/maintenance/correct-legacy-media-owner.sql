-- Owner-approved correction of legacy imports. Run once with a database owner.
-- Snapshot media_assets and learning_items first (supabase/backups is ignored by Git).
begin;
do $$
declare v_teacher text; v_admin text;
begin
  select id into strict v_teacher from public.profiles
    where name = 'Jordan Lee' and role = 'teacher' and status = 'active';
  select id into strict v_admin from public.profiles
    where name = 'Marites Mercado' and role = 'admin' and status = 'active';
  -- Lock both tables so the temporary creator-trigger exception cannot affect concurrent writes.
  lock table public.learning_items, public.media_assets in share row exclusive mode;
  alter table public.media_assets disable trigger preserve_media_uploader;
  update public.media_assets set uploaded_by = v_teacher where uploaded_by = v_admin;
  alter table public.media_assets enable trigger preserve_media_uploader;
  alter table public.learning_items disable trigger preserve_learning_items_creator;
  update public.learning_items set created_by = v_teacher where created_by = v_admin;
  alter table public.learning_items enable trigger preserve_learning_items_creator;
  if exists (select 1 from public.media_assets where uploaded_by = v_admin)
    or exists (select 1 from public.learning_items where created_by = v_admin) then
    raise exception 'Legacy admin attribution remains';
  end if;
end;
$$;
commit;
