-- Independent catalog verification found no ai_usage_events column using ai_usage_status.
-- Explicitly refuse removal if ANY dependency other than the automatic array type remains.
do $$
begin
  if exists (
    select 1 from pg_catalog.pg_type t
    join pg_catalog.pg_depend d on d.refclassid = 'pg_catalog.pg_type'::regclass and d.refobjid = t.oid
    where t.typnamespace = 'public'::regnamespace
      and t.typname in ('ai_usage_status', 'practice_status', 'practice_attempt_status',
        'learner_status', 'preferred_learning_mode')
      and not (d.classid = 'pg_catalog.pg_type'::regclass and d.objid = t.typarray)
  ) then
    raise exception 'A legacy enum still has a dependency; do not remove it';
  end if;
end $$;
drop type if exists public.ai_usage_status restrict;
drop type if exists public.practice_status restrict;
drop type if exists public.practice_attempt_status restrict;
drop type if exists public.learner_status restrict;
drop type if exists public.preferred_learning_mode restrict;
