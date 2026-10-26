-- Atomic paid-attempt reservations. These records contain no camera data or feedback.
create table private.optional_ai_requests (
  id uuid primary key default gen_random_uuid(),
  user_id text not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('gesture-feedback', 'material-preparation')),
  requested_at timestamptz not null
);
create index optional_ai_requests_user_window on private.optional_ai_requests(user_id, feature, requested_at);
alter table private.optional_ai_requests enable row level security;
revoke all on private.optional_ai_requests from public, anon, authenticated;
grant select, insert, delete on private.optional_ai_requests to service_role;

create function public.reserve_optional_ai_request(p_user text, p_feature text)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare v_now timestamptz; v_hour integer; v_day integer; v_role text;
begin
  if p_feature not in ('gesture-feedback', 'material-preparation') then return false; end if;
  select role::text into v_role from public.profiles where id=p_user and status='active';
  if v_role is null or v_role not in ('teacher','admin') or (p_feature='material-preparation' and v_role<>'teacher') then return false; end if;
  perform pg_advisory_xact_lock(hashtextextended('optional-ai:' || p_user || ':' || p_feature, 0));
  -- Take the clock AFTER waiting for the lock. Every device shares this transaction boundary.
  v_now := clock_timestamp();
  select count(*) filter (where requested_at > v_now - interval '1 hour'), count(*)
    into v_hour,v_day from private.optional_ai_requests
    where user_id=p_user and feature=p_feature and requested_at > v_now-interval '24 hours';
  if p_feature='gesture-feedback' and v_hour>=200 then return false; end if;
  if p_feature='material-preparation' and (v_hour>=10 or v_day>=40) then return false; end if;
  delete from private.optional_ai_requests where user_id=p_user and feature=p_feature and requested_at<=v_now-interval '24 hours';
  insert into private.optional_ai_requests(user_id,feature,requested_at) values(p_user,p_feature,v_now);
  return true;
end $$;
revoke all on function public.reserve_optional_ai_request(text,text) from public,anon,authenticated;
grant execute on function public.reserve_optional_ai_request(text,text) to service_role;

-- A claim expires after two minutes. Reclaiming happens only on an explicit request, never a scheduled retry.
create function public.claim_material_preparation(p_user text,p_item text,p_version timestamptz)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_item public.learning_items%rowtype; v_now timestamptz;
begin
  if not exists(select 1 from public.profiles where id=p_user and role='teacher' and status='active') then
    return jsonb_build_object('state','denied');
  end if;
  select * into v_item from public.learning_items where id=p_item and content_type='pecs' for update;
  if not found then return jsonb_build_object('state','missing'); end if;
  if v_item.updated_at is distinct from p_version then return jsonb_build_object('state','changed'); end if;
  v_now:=clock_timestamp();
  if v_item.playground_preparation_status='ready' and v_item.msav_profile is not null then
    return jsonb_build_object('state','ready');
  end if;
  if v_item.playground_preparation_status='processing' and v_item.playground_last_attempt_at>v_now-interval '2 minutes' then
    return jsonb_build_object('state','busy');
  end if;
  if v_item.playground_last_attempt_at>v_now-interval '60 seconds' then
    return jsonb_build_object('state','cooldown');
  end if;
  if not public.reserve_optional_ai_request(p_user,'material-preparation') then
    return jsonb_build_object('state','limited');
  end if;
  update public.learning_items set playground_preparation_status='processing',playground_last_attempt_at=v_now,
    playground_preparation_error=null where id=p_item;
  return jsonb_build_object('state','claimed','attemptedAt',v_now,'version',v_item.updated_at);
end $$;
revoke all on function public.claim_material_preparation(text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.claim_material_preparation(text,text,timestamptz) to service_role;

-- Existing duplicates are retained. Only new labels/type changes are rejected, with a friendly error.
create function private.prevent_duplicate_material_label()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare v_label text;
begin
  v_label:=lower(btrim(regexp_replace(new.label,'\s+',' ','g')));
  if tg_op='UPDATE' then
    if old.content_type=new.content_type and lower(btrim(regexp_replace(old.label,'\s+',' ','g')))=v_label then return new; end if;
  end if;
  perform pg_advisory_xact_lock(hashtextextended('material-label:' || new.content_type::text || ':' || v_label,0));
  if exists(select 1 from public.learning_items where id<>new.id and content_type=new.content_type
      and lower(btrim(regexp_replace(label,'\s+',' ','g')))=v_label) then
    raise exception using errcode='23505', message='A material of this type already uses that label. Open the existing material or choose another label.';
  end if;
  return new;
end $$;
revoke all on function private.prevent_duplicate_material_label() from public,anon,authenticated;
create trigger prevent_duplicate_material_label before insert or update of label,content_type on public.learning_items
for each row execute function private.prevent_duplicate_material_label();

-- See private collections too: shared-material deletion already affects their foreign-key links.
-- This trigger must be definer to protect those hidden dependencies, and authenticates its caller explicitly.
create function private.guard_material_deletion()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if current_setting('role',true) not in ('postgres','service_role','none') and
    (auth.uid() is null or (select private.current_user_role()) is distinct from 'teacher'::public.user_role) then
    raise exception 'Only active teachers can delete materials.';
  end if;
  perform pg_advisory_xact_lock(hashtextextended('material-deletion',0));
  perform 1 from public.lessons where id in(select lesson_id from public.lesson_items where learning_item_id=old.id) order by id for update;
  perform 1 from public.activities where old.id=any(learning_item_ids) or id in
    (select activity_id from public.activity_items where learning_item_id=old.id) order by id for update;
  if exists(select 1 from public.lesson_items li where li.learning_item_id=old.id and not exists
      (select 1 from public.lesson_items remaining where remaining.lesson_id=li.lesson_id and remaining.learning_item_id<>old.id)) then
    raise exception 'This is the last card in a collection. Edit or delete that collection first.';
  end if;
  if exists(select 1 from public.activities a where
      (old.id=any(a.learning_item_ids) or exists(select 1 from public.activity_items q where q.activity_id=a.id and q.learning_item_id=old.id))
      and not exists(select 1 from public.activity_items q join public.learning_items i on i.id=q.learning_item_id
        where q.activity_id=a.id and q.learning_item_id<>old.id)) then
    raise exception 'This is the last question in an activity. Edit or delete that activity first.';
  end if;
  update public.activities set learning_item_ids=array_remove(learning_item_ids,old.id),updated_at=clock_timestamp()
    where old.id=any(learning_item_ids);
  return old;
end $$;
revoke all on function private.guard_material_deletion() from public,anon,authenticated;
create trigger guard_material_deletion before delete on public.learning_items
for each row execute function private.guard_material_deletion();

-- Keep media records until cleanup finishes so a failed Storage request can be retried from Media.
alter table public.media_assets add column deletion_pending boolean not null default false;

-- Partial preference patches serialize on the user's row. They cannot overwrite an unrelated toggle.
create function public.patch_user_preferences(p_patch jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_user text:=auth.uid()::text; v_row public.user_settings%rowtype; v_key text;
begin
  if v_user is null or coalesce((select private.current_user_role())::text,'') not in ('teacher','admin') then raise exception 'Sign in with an active account.'; end if;
  if jsonb_typeof(p_patch)<>'object' then raise exception 'Invalid settings.'; end if;
  for v_key in select jsonb_object_keys(p_patch) loop
    if v_key not in ('large_text','high_contrast','reduce_motion','audio_guidance','guide_mode','guide_key','guide_seen','guide_reset') then raise exception 'Unknown setting.'; end if;
    if v_key<>'guide_key' and jsonb_typeof(p_patch->v_key)<>'boolean' then raise exception 'Invalid setting value.'; end if;
  end loop;
  if p_patch ? 'guide_key' and (jsonb_typeof(p_patch->'guide_key')<>'string' or length(p_patch->>'guide_key')>500 or length(p_patch->>'guide_key')=0) then raise exception 'Invalid guide key.'; end if;
  insert into public.user_settings(user_id) values(v_user) on conflict(user_id) do nothing;
  select * into v_row from public.user_settings where user_id=v_user for update;
  if not found then raise exception 'Settings unavailable.'; end if;
  if p_patch ? 'large_text' then v_row.large_text:=(p_patch->>'large_text')::boolean; end if;
  if p_patch ? 'high_contrast' then
    v_row.high_contrast:=(p_patch->>'high_contrast')::boolean;
    v_row.theme:=case when v_row.high_contrast then 'high-contrast' else 'soft-blue' end;
  end if;
  if p_patch ? 'reduce_motion' then v_row.reduce_motion:=(p_patch->>'reduce_motion')::boolean; end if;
  if p_patch ? 'audio_guidance' then v_row.audio_guidance:=(p_patch->>'audio_guidance')::boolean; end if;
  if p_patch ? 'guide_mode' then v_row.guide_mode:=(p_patch->>'guide_mode')::boolean; end if;
  if coalesce((p_patch->>'guide_reset')::boolean,false) then
    v_row.guide_seen:=array(select key from unnest(v_row.guide_seen) key where key like 'hide-activity:%');
  elsif p_patch ? 'guide_key' then
    v_row.guide_seen:=array_remove(v_row.guide_seen,p_patch->>'guide_key');
    if coalesce((p_patch->>'guide_seen')::boolean,false) then v_row.guide_seen:=array_append(v_row.guide_seen,p_patch->>'guide_key'); end if;
  end if;
  update public.user_settings set large_text=v_row.large_text,high_contrast=v_row.high_contrast,
    reduce_motion=v_row.reduce_motion,audio_guidance=v_row.audio_guidance,guide_mode=v_row.guide_mode,
    guide_seen=v_row.guide_seen,theme=v_row.theme,updated_at=clock_timestamp() where user_id=v_user returning * into v_row;
  return to_jsonb(v_row);
end $$;
revoke all on function public.patch_user_preferences(jsonb) from public,anon;
grant execute on function public.patch_user_preferences(jsonb) to authenticated;
notify pgrst,'reload schema';
