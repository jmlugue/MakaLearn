-- MakaLearn Storage buckets and authenticated policies.
-- Run after supabase/schema.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('symbol-images', 'symbol-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('gesture-media', 'gesture-media', true, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('audio-files', 'audio-files', true, 20971520, array['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Authenticated read MakaLearn media" on storage.objects;
drop policy if exists "Authenticated upload MakaLearn media" on storage.objects;
drop policy if exists "Authenticated update MakaLearn media" on storage.objects;
drop policy if exists "Authenticated delete MakaLearn media" on storage.objects;
drop policy if exists "Active users read MakaLearn media" on storage.objects;
drop policy if exists "Teachers upload shared MakaLearn media" on storage.objects;
drop policy if exists "Teachers update shared MakaLearn media" on storage.objects;
drop policy if exists "Teachers delete shared MakaLearn media" on storage.objects;

create policy "Active users read MakaLearn media"
on storage.objects for select
to authenticated
using (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) in ('admin', 'teacher')
);

create policy "Teachers upload shared MakaLearn media"
on storage.objects for insert
to authenticated
with check (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
);

create policy "Teachers update shared MakaLearn media"
on storage.objects for update
to authenticated
using (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
)
with check (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
);

create policy "Teachers delete shared MakaLearn media"
on storage.objects for delete
to authenticated
using (
  bucket_id in ('symbol-images', 'gesture-media', 'audio-files')
  and (select private.current_user_role()) = 'teacher'
);
