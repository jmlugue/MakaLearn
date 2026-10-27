-- Exercise the real hosted authorization roles without retaining changes.
begin;
do $$
declare
  v_teacher text; v_admin text; v_other text; v_name text; v_count int;
  v_media text; v_item text;
begin
  select id into strict v_teacher from public.profiles where name='Jordan Lee' and role='teacher' and status='active';
  select id into strict v_admin from public.profiles where name='Marites Mercado' and role='admin' and status='active';
  select id,name into v_other,v_name from public.profiles where role='teacher' and status='active' and id<>v_teacher order by id limit 1;
  select id into v_media from public.media_assets limit 1;
  select id into v_item from public.learning_items limit 1;
  if exists(select 1 from public.media_assets where uploaded_by<>v_teacher)
    or exists(select 1 from public.learning_items where created_by<>v_teacher) then
    raise exception 'Existing imports are not attributed to Jordan Lee';
  end if;
  if has_function_privilege('anon','public.content_author_names()','execute')
    or has_function_privilege('anon','private.content_author_names()','execute') then
    raise exception 'Anonymous directory access';
  end if;
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_teacher,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if (select name from public.content_author_names() where id=v_admin) is distinct from 'Marites Mercado'
    or (select name from public.content_author_names() where id=v_other) is distinct from v_name then
    raise exception 'Teacher cannot resolve actual names from other accounts';
  end if;
  if exists(select 1 from public.profiles where id=v_admin) then raise exception 'Full admin profile exposed to teacher'; end if;
  -- Preserve immutable uploader identity on ordinary teacher edits.
  begin
    update public.media_assets set uploaded_by=v_other where id=v_media;
    raise exception 'Teacher changed uploader';
  exception when raise_exception then
    if sqlerrm <> 'uploaded_by cannot be changed' then raise; end if;
  end;
  execute 'reset role';
  perform set_config('request.jwt.claims',jsonb_build_object('sub',v_admin,'role','authenticated')::text,true);
  execute 'set local role authenticated';
  if (select name from public.content_author_names() where id=v_teacher) is distinct from 'Jordan Lee' then
    raise exception 'Admin cannot resolve teacher name';
  end if;
  update public.media_assets set title=title where id=v_media;
  get diagnostics v_count=row_count;
  if v_count<>0 then raise exception 'Admin updated media'; end if;
  delete from public.media_assets where id=v_media;
  get diagnostics v_count=row_count;
  if v_count<>0 then raise exception 'Admin deleted media'; end if;
  update public.learning_items set description=description where id=v_item;
  get diagnostics v_count=row_count;
  if v_count<>0 then raise exception 'Admin updated material'; end if;
  delete from public.learning_items where id=v_item;
  get diagnostics v_count=row_count;
  if v_count<>0 then raise exception 'Admin deleted material'; end if;
  begin
    insert into public.media_assets(id,title,type,file_name,bucket,storage_path,uploaded_by)
      values ('uploader-role-fixture','Fixture','symbol-image','fixture.png','symbol-images','fixture.png',v_admin);
    raise exception 'Admin created media';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.learning_items(id,label,content_type,category_id,description,instruction,tags,created_by)
      values ('uploader-role-fixture','Unique uploader role fixture','pecs','cat-no-category','','','{}',v_admin);
    raise exception 'Admin created material';
  exception when insufficient_privilege then null;
  end;
  execute 'reset role';
  -- An authenticated JWT without an active account cannot enumerate names.
  perform set_config('request.jwt.claims',jsonb_build_object('sub','00000000-0000-0000-0000-000000000000','role','authenticated')::text,true);
  execute 'set local role authenticated';
  if exists(select 1 from public.content_author_names()) then raise exception 'Inactive/unknown caller sees names'; end if;
  execute 'reset role';
end;
$$;
rollback;
