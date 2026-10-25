-- Run through a privileged SQL connection. Every change is rolled back.
-- Uses an existing active administrator; no accounts or persistent grades created.
begin;
set local role service_role;
do $$
declare
  account_id text;
  claim jsonb;
  first_token uuid;
  quota_before bigint;
begin
  select id into account_id from public.profiles where status='active' and role='admin' limit 1;
  assert account_id is not null, 'Active admin needed for database verification';
  assert not has_table_privilege('anon','public.playground_check_decisions','select');
  assert not has_table_privilege('authenticated','public.playground_check_decisions','update');
  assert not has_sequence_privilege('anon','public.playground_check_requests_id_seq','USAGE,SELECT,UPDATE');
  assert not has_sequence_privilege('authenticated','public.playground_check_corrections_id_seq','USAGE,SELECT,UPDATE');
  assert not has_function_privilege('authenticated','public.claim_playground_check(text,text,text,text)','execute');
  assert (select relrowsecurity from pg_class where oid='public.playground_check_decisions'::regclass);
  select count(*) into quota_before from public.playground_check_requests where user_id=account_id;
  claim := public.claim_playground_check('test-rollback',repeat('a',64),'i am sorry',account_id);
  assert claim->>'state'='claimed';
  first_token := (claim->>'token')::uuid;
  claim := public.claim_playground_check('test-rollback',repeat('a',64),'i am sorry',account_id);
  assert claim->>'state'='busy';
  assert (select count(*)=quota_before+1 from public.playground_check_requests where user_id=account_id);
  update public.playground_check_decisions set lease_until=now()-interval '1 second' where policy_version='test-rollback';
  claim := public.claim_playground_check('test-rollback',repeat('a',64),'i am sorry',account_id);
  assert claim->>'state'='claimed';
  assert (claim->>'token')::uuid <> first_token;
  update public.playground_check_decisions set is_valid=false,construction_type=null,decided_at=now(),lease_token=null,lease_until=null
    where policy_version='test-rollback';
  claim := public.claim_playground_check('test-rollback',repeat('a',64),'i am sorry',account_id);
  assert claim#>>'{decision,valid}'='false';
  perform public.correct_playground_check('test-rollback',repeat('a',64),'i am sorry',account_id,true,'sentence');
  claim := public.claim_playground_check('test-rollback',repeat('a',64),'i am sorry',account_id);
  assert claim#>>'{decision,valid}'='true';
  assert (select count(*)=1 from public.playground_check_corrections where policy_version='test-rollback');
  insert into public.playground_check_requests(user_id) select account_id from generate_series(1,30);
  claim := public.claim_playground_check('test-rollback',repeat('b',64),'water',account_id);
  assert claim->>'state'='limited';
  claim := public.claim_playground_check('test-rollback',repeat('a',64),'i am sorry',account_id);
  assert claim->>'state'='ready';
end $$;
select 'passed: cache, lease, quota, corrections, and permissions (rolled back)' as playground_database_checks;
rollback;
