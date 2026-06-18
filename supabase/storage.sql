-- MakaLearn Storage buckets and authenticated policies.
-- Run after supabase/schema.sql.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('symbol-images', 'symbol-images', true, 10485760, array['image/png', 'image/jpeg', 'image/webp', 'image/gif']),
  ('gesture-media', 'gesture-media', true, 52428800, array['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime']),
  ('audio-files', 'audio-files', true, 20971520, array['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/aac', 'audio/ogg']),
  ('learner-photos', 'learner-photos', true, 10485760, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated read MakaLearn media"
on storage.objects for select
to authenticated
using (bucket_id in ('symbol-images', 'gesture-media', 'audio-files', 'learner-photos'));

create policy "Authenticated upload MakaLearn media"
on storage.objects for insert
to authenticated
with check (bucket_id in ('symbol-images', 'gesture-media', 'audio-files', 'learner-photos'));

create policy "Authenticated update MakaLearn media"
on storage.objects for update
to authenticated
using (bucket_id in ('symbol-images', 'gesture-media', 'audio-files', 'learner-photos'))
with check (bucket_id in ('symbol-images', 'gesture-media', 'audio-files', 'learner-photos'));

create policy "Authenticated delete MakaLearn media"
on storage.objects for delete
to authenticated
using (bucket_id in ('symbol-images', 'gesture-media', 'audio-files', 'learner-photos'));
