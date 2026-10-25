-- Server-owned grading decisions: clients cannot read, poison, or overwrite them.
create table public.playground_check_decisions (
  policy_version text not null,
  input_hash text not null check (input_hash ~ '^[a-f0-9]{64}$'),
  normalized_text text not null check (length(normalized_text) between 1 and 500),
  is_valid boolean,
  construction_type text check (construction_type in ('word','phrase','sentence')),
  model text not null default '',
  lease_token uuid,
  lease_until timestamptz,
  decided_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (policy_version,input_hash),
  check ((is_valid is null and construction_type is null) or
         (is_valid = false and construction_type is null) or
         (is_valid = true and construction_type is not null))
);
create table public.playground_check_requests (
  id bigint generated always as identity primary key,
  user_id text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index playground_check_requests_user_time on public.playground_check_requests(user_id,created_at);
create index playground_check_requests_time on public.playground_check_requests(created_at);
create table public.playground_check_corrections (
  id bigint generated always as identity primary key,
  policy_version text not null,
  input_hash text not null,
  corrected_by text references public.profiles(id) on delete set null,
  old_decision jsonb,
  new_decision jsonb not null,
  created_at timestamptz not null default now()
);
alter table public.playground_check_decisions enable row level security;
alter table public.playground_check_requests enable row level security;
alter table public.playground_check_corrections enable row level security;
revoke all on public.playground_check_decisions, public.playground_check_requests, public.playground_check_corrections from public,anon,authenticated;
grant all on public.playground_check_decisions, public.playground_check_requests, public.playground_check_corrections to service_role;
grant usage,select on sequence public.playground_check_requests_id_seq, public.playground_check_corrections_id_seq to service_role;

-- Invoker, service-only RPC. One transaction claims a unique input and reserves
-- quota. A process-local counter or lock would not protect multiple app servers.
create function public.claim_playground_check(p_policy text,p_hash text,p_text text,p_user text)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  saved public.playground_check_decisions%rowtype;
  token uuid := gen_random_uuid();
begin
  if not exists(select 1 from public.profiles where id=p_user and status='active' and role in ('teacher','admin')) then
    raise exception 'Active account required';
  end if;
  perform pg_advisory_xact_lock(731480725);
  select * into saved from public.playground_check_decisions where policy_version=p_policy and input_hash=p_hash for update;
  if found and saved.normalized_text <> p_text then raise exception 'Input mismatch'; end if;
  if saved.is_valid is not null then
    return jsonb_build_object('state','ready','decision',jsonb_build_object('valid',saved.is_valid,'type',saved.construction_type));
  end if;
  if saved.lease_until > clock_timestamp() then return jsonb_build_object('state','busy'); end if;
  if (select count(*) from public.playground_check_requests where user_id=p_user and created_at > now()-interval '1 minute') >= 30
     or (select count(*) from public.playground_check_requests where user_id=p_user and created_at > now()-interval '1 day') >= 300
     or (select count(*) from public.playground_check_requests where created_at > now()-interval '1 day') >= 3000 then
    return jsonb_build_object('state','limited');
  end if;
  insert into public.playground_check_requests(user_id) values(p_user);
  delete from public.playground_check_requests where created_at < now()-interval '7 days';
  insert into public.playground_check_decisions(policy_version,input_hash,normalized_text,lease_token,lease_until)
    values(p_policy,p_hash,p_text,token,clock_timestamp()+interval '30 seconds')
    on conflict(policy_version,input_hash) do update set lease_token=excluded.lease_token,lease_until=excluded.lease_until;
  return jsonb_build_object('state','claimed','token',token);
end $$;
revoke all on function public.claim_playground_check(text,text,text,text) from public,anon,authenticated;
grant execute on function public.claim_playground_check(text,text,text,text) to service_role;

-- Explicit administrator correction, including an audit trail. No Playground UI.
create function public.correct_playground_check(p_policy text,p_hash text,p_text text,p_user text,p_valid boolean,p_type text)
returns void language plpgsql security invoker set search_path = '' as $$
declare previous jsonb;
begin
  if not exists(select 1 from public.profiles where id=p_user and status='active' and role='admin') then
    raise exception 'Administrator required';
  end if;
  if p_valid is null or (p_valid and (p_type is null or p_type not in ('word','phrase','sentence'))) or (not p_valid and p_type is not null) then
    raise exception 'Invalid decision';
  end if;
  perform pg_advisory_xact_lock(731480725);
  select jsonb_build_object('valid',is_valid,'type',construction_type) into previous
    from public.playground_check_decisions where policy_version=p_policy and input_hash=p_hash for update;
  insert into public.playground_check_decisions(policy_version,input_hash,normalized_text,is_valid,construction_type,model,decided_at)
    values(p_policy,p_hash,p_text,p_valid,p_type,'administrator',now())
    on conflict(policy_version,input_hash) do update set
      is_valid=excluded.is_valid,construction_type=excluded.construction_type,model='administrator',
      decided_at=now(),lease_token=null,lease_until=null;
  insert into public.playground_check_corrections(policy_version,input_hash,corrected_by,old_decision,new_decision)
    values(p_policy,p_hash,p_user,previous,jsonb_build_object('valid',p_valid,'type',p_type));
end $$;
revoke all on function public.correct_playground_check(text,text,text,text,boolean,text) from public,anon,authenticated;
grant execute on function public.correct_playground_check(text,text,text,text,boolean,text) to service_role;

-- Grammar has its own metadata; existing MSAV role assignments remain unchanged.
alter table public.learning_items add column grammar_kind text
  check (grammar_kind in ('article','infinitive','conjunction','negation'));
comment on column public.learning_items.grammar_kind is 'Context-dependent grammar material, excluded from ordinary picture-answer activities.';
