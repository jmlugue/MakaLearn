-- Live RLS regression with simulated JWT subjects; every test write is rolled back.
-- This verifies database authorization, not the Auth password/sign-in flow.
begin;
select set_config('makalearn.readiness_id', 'test-readiness-' || gen_random_uuid()::text, true);
select set_config('request.jwt.claim.sub', id, true) from public.profiles
where role = 'teacher' and status = 'active' order by id limit 1;
set local role authenticated;
insert into public.collections (id,title,objective,instructions,activity_type,
  estimated_duration,notes,source,visibility,created_by)
values (current_setting('makalearn.readiness_id'), '[TEST] Readiness', 'Test', 'Test',
  'match-word-symbol', 5, '', 'manual', 'private', auth.uid()::text);
select public.upsert_collection_items(jsonb_build_array(jsonb_build_object(
  'collection_id',current_setting('makalearn.readiness_id'),
  'learning_item_id',(select id from public.learning_items where content_type = 'pecs' order by id limit 1),
  'position',2)));
select public.upsert_collection_items(jsonb_build_array(jsonb_build_object(
  'collection_id',current_setting('makalearn.readiness_id'),
  'learning_item_id',(select id from public.learning_items where content_type = 'pecs' order by id limit 1),
  'position',0)));
do $$
begin
  if (select count(*) from public.collection_items where collection_id = current_setting('makalearn.readiness_id') and position = 0) <> 1
    or (select count(*) from public.lesson_items where lesson_id = current_setting('makalearn.readiness_id') and position = 0) <> 1 then
    raise exception 'Collection upsert or legacy compatibility failed';
  end if;
  if exists(select 1 from public.learners) or exists(select 1 from public.practice_attempts) then
    raise exception 'Retired compatibility endpoints must be empty';
  end if;
end $$;
update public.collections set title = '[TEST] Updated' where id = current_setting('makalearn.readiness_id');
-- Same payload as insertActivityPlay, after removal of obsolete result columns.
insert into public.activity_results (id,activity_id,teacher_id,score,correct_count,incorrect_count,answers)
select 'result-' || current_setting('makalearn.readiness_id'), id, auth.uid()::text,100,1,0,
  '{"source":"student-mode","durationSeconds":"5"}'::jsonb
from public.activities where type = 'match-word-symbol' order by id limit 1;
-- Legacy table upserts remain available to old deployed bundles.
insert into public.lesson_items (lesson_id,learning_item_id,position)
select collection_id,learning_item_id,1 from public.collection_items
where collection_id = current_setting('makalearn.readiness_id')
on conflict (lesson_id,learning_item_id) do update set position = excluded.position;
reset role;
select set_config('request.jwt.claim.sub', id, true) from public.profiles
where role = 'teacher' and status = 'active'
  and id <> (select created_by from public.lessons where id = current_setting('makalearn.readiness_id'))
order by id limit 1;
set local role authenticated;
do $$
declare changed integer;
begin
  if exists(select 1 from public.collections where id = current_setting('makalearn.readiness_id')) then
    raise exception 'Another teacher can see the private collection';
  end if;
  if exists(select 1 from public.activity_results where id = 'result-' || current_setting('makalearn.readiness_id')) then
    raise exception 'Another teacher can see someone else''s activity result';
  end if;
  delete from public.collections where id = current_setting('makalearn.readiness_id');
  get diagnostics changed = row_count;
  if changed <> 0 then raise exception 'Another teacher deleted the private collection'; end if;
end $$;
reset role;
select set_config('request.jwt.claim.sub', id, true) from public.profiles
where role = 'admin' and status = 'active' order by id limit 1;
set local role authenticated;
do $$
begin
  if not exists(select 1 from public.collections where id = current_setting('makalearn.readiness_id')) then
    raise exception 'Admin cannot read teacher collection';
  end if;
  if not exists(select 1 from public.activity_results
    where id = 'result-' || current_setting('makalearn.readiness_id') and score = 100
      and answers @> '{"source":"student-mode","durationSeconds":"5"}'::jsonb) then
    raise exception 'Admin cannot read the saved Student Mode result';
  end if;
  begin
    perform public.upsert_collection_items('[]'::jsonb);
    raise exception 'Admin could write through collection RPC';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
select set_config('request.jwt.claim.sub', created_by, true) from public.lessons
where id = current_setting('makalearn.readiness_id');
set local role authenticated;
delete from public.collections where id = current_setting('makalearn.readiness_id');
do $$
begin
  if exists(select 1 from public.collections where id = current_setting('makalearn.readiness_id'))
    or exists(select 1 from public.collection_items where collection_id = current_setting('makalearn.readiness_id')) then
    raise exception 'Collection delete/cascade failed';
  end if;
end $$;
reset role;
set local role anon;
do $$
begin
  begin
    perform 1 from public.collections limit 1;
    raise exception 'Anonymous Collection access was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
reset role;
rollback;
select 'Collection CRUD/reorder, legacy writes, Student Mode result persistence, teacher isolation, admin read-only and anonymous denial passed; all test writes rolled back' as verification;
