-- Run after the review migration, inside BEGIN/ROLLBACK. No fixture or quota data is retained.
do $$
declare v_teacher text:=gen_random_uuid()::text; v_owner text:=gen_random_uuid()::text; v_category text; v_claim jsonb; v_version timestamptz; v_result jsonb;
begin
  select id into v_category from public.categories limit 1;
  if v_category is null then raise exception 'A category is required.'; end if;
  insert into public.profiles(id,name,email,role,status) values
    (v_teacher,'[TEST] Review teacher',v_teacher || '@invalid.local','teacher','active'),
    (v_owner,'[TEST] Other teacher',v_owner || '@invalid.local','teacher','active');

  if has_function_privilege('authenticated','public.reserve_optional_ai_request(text,text)','EXECUTE') or
     has_function_privilege('anon','public.reserve_optional_ai_request(text,text)','EXECUTE') or
     has_table_privilege('authenticated','private.optional_ai_requests','INSERT') or
     has_table_privilege('anon','private.optional_ai_requests','SELECT') then raise exception 'Quota boundary is public.'; end if;

  -- Reservations are exercised as the actual server role, not only as the owner.
  execute 'set local role service_role';
  for i in 1..200 loop
    if not public.reserve_optional_ai_request(v_teacher,'gesture-feedback') then raise exception 'Request % refused early',i; end if;
  end loop;
  if public.reserve_optional_ai_request(v_teacher,'gesture-feedback') then raise exception 'Request 201 allowed'; end if;
  if public.reserve_optional_ai_request('missing-profile','gesture-feedback') then raise exception 'Unknown account allowed'; end if;
  if public.reserve_optional_ai_request(v_teacher,'forged-feature') then raise exception 'Unknown feature allowed'; end if;
  execute 'reset role';
  update private.optional_ai_requests set requested_at=clock_timestamp()-interval '61 minutes'
    where id=(select id from private.optional_ai_requests where user_id=v_teacher and feature='gesture-feedback' limit 1);
  execute 'set local role service_role';
  if not public.reserve_optional_ai_request(v_teacher,'gesture-feedback') then raise exception 'Expired reservation not released'; end if;
  if public.reserve_optional_ai_request(v_teacher,'gesture-feedback') then raise exception 'Rolling quota exceeded'; end if;
  execute 'reset role';

  insert into public.learning_items(id,label,content_type,category_id,description,instruction,tags,created_by) values
    ('review-guard-one','Review guard one','pecs',v_category,'Fixture','Fixture','{}',v_teacher),
    ('review-guard-two','Review guard two','pecs',v_category,'Fixture','Fixture','{}',v_teacher),
    ('review-guard-cross-type','Review guard one','gesture',v_category,'Fixture','Fixture','{}',v_teacher);
  begin
    insert into public.learning_items(id,label,content_type,category_id,description,instruction,tags,created_by)
      values('review-guard-duplicate', E'  REVIEW\t GUARD   ONE  ','pecs',v_category,'Fixture','Fixture','{}',v_teacher);
    raise exception 'Duplicate label allowed';
  exception when unique_violation then null; end;
  -- Metadata-only edits and a record's own normalized label remain legal.
  update public.learning_items set label='REVIEW GUARD ONE',description='Edited fixture' where id='review-guard-one';

  insert into public.lessons(id,title,objective,instructions,activity_type,estimated_duration,created_by)
    values('review-guard-collection','Review fixture','','','match-word-symbol',5,v_teacher);
  insert into public.lesson_items(lesson_id,learning_item_id,position) values
    ('review-guard-collection','review-guard-one',0),('review-guard-collection','review-guard-two',1);
  insert into public.activities(id,title,type,prompt,learning_item_ids,created_by)
    values('review-guard-activity','Review fixture','match-word-symbol','Fixture',array['review-guard-one','review-guard-two'],v_teacher);
  insert into public.activity_items(id,activity_id,prompt,answer,learning_item_id,position) values
    ('review-guard-q1','review-guard-activity','Fixture','review-guard-one','review-guard-one',0),
    ('review-guard-q2','review-guard-activity','Fixture','review-guard-two','review-guard-two',1);
  delete from public.learning_items where id='review-guard-one';
  if (select count(*) from public.lesson_items where lesson_id='review-guard-collection')<>1 or
     (select count(*) from public.activity_items where activity_id='review-guard-activity')<>1 or
     (select learning_item_ids from public.activities where id='review-guard-activity')<>array['review-guard-two'] then raise exception 'Dependent records not repaired'; end if;
  begin
    delete from public.learning_items where id='review-guard-two';
    raise exception 'Last collection card deleted';
  exception when raise_exception then if sqlerrm not like 'This is the last card%' then raise; end if; end;
  delete from public.lesson_items where lesson_id='review-guard-collection';
  begin
    delete from public.learning_items where id='review-guard-two';
    raise exception 'Last activity question deleted';
  exception when raise_exception then if sqlerrm not like 'This is the last question%' then raise; end if; end;

  update public.learning_items set playground_preparation_status='processing',playground_last_attempt_at=clock_timestamp()-interval '3 minutes' where id='review-guard-two';
  select updated_at into v_version from public.learning_items where id='review-guard-two';
  execute 'set local role service_role';
  v_claim:=public.claim_material_preparation(v_teacher,'review-guard-two',v_version);
  if v_claim->>'state'<>'claimed' then raise exception 'Stale preparation not reclaimed: %',v_claim; end if;
  v_claim:=public.claim_material_preparation(v_teacher,'review-guard-two',v_version);
  if v_claim->>'state'<>'busy' then raise exception 'Concurrent preparation allowed'; end if;
  for i in 2..10 loop
    if not public.reserve_optional_ai_request(v_teacher,'material-preparation') then raise exception 'Preparation allowance refused early'; end if;
  end loop;
  if public.reserve_optional_ai_request(v_teacher,'material-preparation') then raise exception 'Preparation hourly allowance exceeded'; end if;
  execute 'reset role';
  update private.optional_ai_requests set requested_at=clock_timestamp()-interval '2 hours' where user_id=v_teacher and feature='material-preparation';
  execute 'set local role service_role';
  for j in 1..3 loop
    for i in 1..10 loop
      if not public.reserve_optional_ai_request(v_teacher,'material-preparation') then raise exception 'Preparation daily allowance refused early'; end if;
    end loop;
    execute 'reset role';
  update private.optional_ai_requests set requested_at=clock_timestamp()-interval '2 hours' where user_id=v_teacher and feature='material-preparation';
    execute 'set local role service_role';
  end loop;
  if public.reserve_optional_ai_request(v_teacher,'material-preparation') then raise exception 'Preparation daily allowance exceeded'; end if;
  execute 'reset role';

  perform set_config('request.jwt.claim.sub',v_teacher,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_teacher,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  perform public.patch_user_preferences('{"large_text":true,"high_contrast":false}');
  v_result:=public.patch_user_preferences('{"reduce_motion":true}');
  if (v_result->>'large_text')::boolean is not true or (v_result->>'reduce_motion')::boolean is not true then raise exception 'Independent preference lost'; end if;
  perform public.patch_user_preferences('{"guide_key":"hide-activity:review-fixture","guide_seen":true}');
  perform public.patch_user_preferences('{"guide_key":"welcome","guide_seen":true}');
  v_result:=public.patch_user_preferences('{"guide_reset":true}');
  if not (v_result->'guide_seen') ? 'hide-activity:review-fixture' or (v_result->'guide_seen') ? 'welcome' then raise exception 'Tour reset changed visibility'; end if;
  v_result:=public.patch_user_preferences('{"guide_key":"hide-activity:review-fixture","guide_seen":false}');
  if (v_result->'guide_seen') ? 'hide-activity:review-fixture' then raise exception 'Unhide failed'; end if;
  execute 'reset role';

  -- The delete guard must see another teacher's private dependencies without disclosing their title.
  insert into public.lessons(id,title,objective,instructions,activity_type,estimated_duration,visibility,created_by)
    values('review-guard-private','Private fixture','','','match-word-symbol',5,'private',v_owner);
  insert into public.lesson_items(lesson_id,learning_item_id) values('review-guard-private','review-guard-cross-type');
  insert into public.learning_items(id,label,content_type,category_id,description,instruction,tags,created_by)
    values('review-guard-delete-auth','Review deletion control','pecs',v_category,'Fixture','Fixture','{}',v_teacher);
  execute 'set local role authenticated';
  if exists(select 1 from public.lessons where id='review-guard-private') then raise exception 'Private dependency leaked'; end if;
  begin
    delete from public.learning_items where id='review-guard-cross-type';
    raise exception 'Hidden last-card dependency was not protected';
  exception when raise_exception then if sqlerrm not like 'This is the last card%' then raise; end if; end;
  delete from public.learning_items where id='review-guard-delete-auth';
  if exists(select 1 from public.learning_items where id='review-guard-delete-auth') then raise exception 'Legitimate teacher delete refused'; end if;
  execute 'reset role';
end $$;
select 'quota, preparation, duplicates, deletion, and settings guards passed' as result;
