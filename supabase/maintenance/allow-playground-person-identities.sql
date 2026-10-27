-- Owner-approved correction: only existing I + am + Family/People PECS decisions.
-- Preserve the old decision in the existing correction audit table. Safe to rerun.
begin;
select pg_advisory_xact_lock(731480725);
with targets as (
  select d.* from public.playground_check_decisions d
  where d.policy_version = 'english-v1'
    and (d.is_valid is distinct from true or d.construction_type is distinct from 'sentence')
    and exists (
      select 1 from public.learning_items i
      join public.categories c on c.id = i.category_id
      where i.content_type = 'pecs' and lower(trim(c.name)) in ('family','people')
        and d.normalized_text = 'i am ' || lower(regexp_replace(trim(i.label), '\s+', ' ', 'g'))
    )
  for update
), audited as (
  insert into public.playground_check_corrections
    (policy_version,input_hash,corrected_by,old_decision,new_decision)
  select policy_version,input_hash,null,
    jsonb_build_object('valid',is_valid,'type',construction_type,'model',model,'decided_at',decided_at),
    '{"valid":true,"type":"sentence","reason":"Owner-approved I + am + Family/People article omission"}'::jsonb
  from targets
  returning policy_version,input_hash
)
update public.playground_check_decisions d
set is_valid = true, construction_type = 'sentence', model = 'owner-approved-person-identity',
    decided_at = now(), lease_token = null, lease_until = null
from audited a where d.policy_version = a.policy_version and d.input_hash = a.input_hash
returning d.normalized_text,d.is_valid,d.construction_type;
commit;
