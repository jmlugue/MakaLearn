-- Owner approved verified-unused retirement on 2026-10-17.
-- No CASCADE: unexpected dependencies must abort rather than disappear silently.
do $$
begin
  if exists (select 1 from public.practice_attempts) then
    raise exception 'Gesture attempts are no longer empty; review before retirement';
  end if;
  if (select count(*) from public.learners) > 2
    or exists (select 1 from public.activity_results where learner_id is not null) then
    raise exception 'Learner records or dependencies changed; review before retirement';
  end if;
  if exists (select 1 from public.media_assets
    where bucket::text = 'learner-photos' or type::text = 'learner-photo')
    or exists (select 1 from storage.objects where bucket_id = 'learner-photos') then
    raise exception 'Learner media is in use; review before retirement';
  end if;
end $$;

-- The live usage chart is teacher-attributed, never learner-attributed.
drop policy "Role-aware read activity results" on public.activity_results;
create policy "Role-aware read activity results" on public.activity_results
for select to authenticated using (
  (select private.current_user_role()) = 'admin'::public.user_role
  or ((select private.current_user_role()) = 'teacher'::public.user_role
    and teacher_id = (select auth.uid())::text)
);
alter table public.activity_results drop column learner_id;
drop table public.practice_attempts;
drop table public.learners;

-- Old deployed bundles still SELECT these endpoints during load/validation.
-- Empty, read-only compatibility views retain no learner or gesture-attempt data.
create view public.learners with (security_invoker = true) as
select null::text as id, null::text as name, null::integer as age,
  null::text as grade_level, null::text as communication_needs,
  null::text as preferred_learning_mode, null::text as assigned_teacher_id,
  null::text as status, null::timestamptz as created_at, null::timestamptz as updated_at
where false;
create view public.practice_attempts with (security_invoker = true) as
select null::text as id, null::text as learner_id, null::text as learning_item_id,
  null::text as status, null::text as feedback, null::timestamptz as attempted_at,
  null::text as saved_by, null::text as teacher_id, null::timestamptz as created_at
where false;
revoke all on public.learners, public.practice_attempts from public, anon, authenticated;
grant select on public.learners, public.practice_attempts to authenticated, service_role;
comment on view public.learners is 'Empty compatibility endpoint for pre-retirement deployments; no learner records are retained.';
comment on view public.practice_attempts is 'Empty compatibility endpoint for old material validators; gesture attempts are never persisted.';

notify pgrst, 'reload schema';
