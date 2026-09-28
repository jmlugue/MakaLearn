-- Shared activities are collaborative teacher resources. Private activities
-- remain writable only by their creator. Admins can read but cannot modify
-- teaching activities.

drop policy if exists "Role-aware write activities" on public.activities;
drop policy if exists "Authenticated write activity items" on public.activity_items;
drop policy if exists "Teachers insert own activities" on public.activities;
drop policy if exists "Teachers update available activities" on public.activities;
drop policy if exists "Teachers delete available activities" on public.activities;
drop policy if exists "Teachers insert available activity items" on public.activity_items;
drop policy if exists "Teachers update available activity items" on public.activity_items;
drop policy if exists "Teachers delete available activity items" on public.activity_items;

create policy "Teachers insert own activities"
on public.activities for insert
to authenticated
with check (
  public.current_user_role() = 'teacher'
  and created_by = auth.uid()::text
);

create policy "Teachers update available activities"
on public.activities for update
to authenticated
using (
  public.current_user_role() = 'teacher'
  and (visibility = 'shared' or created_by = auth.uid()::text)
)
with check (
  public.current_user_role() = 'teacher'
  and (visibility = 'shared' or created_by = auth.uid()::text)
);

create policy "Teachers delete available activities"
on public.activities for delete
to authenticated
using (
  public.current_user_role() = 'teacher'
  and (visibility = 'shared' or created_by = auth.uid()::text)
);

create policy "Teachers insert available activity items"
on public.activity_items for insert
to authenticated
with check (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and public.current_user_role() = 'teacher'
      and (activities.visibility = 'shared' or activities.created_by = auth.uid()::text)
  )
);

create policy "Teachers update available activity items"
on public.activity_items for update
to authenticated
using (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and public.current_user_role() = 'teacher'
      and (activities.visibility = 'shared' or activities.created_by = auth.uid()::text)
  )
)
with check (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and public.current_user_role() = 'teacher'
      and (activities.visibility = 'shared' or activities.created_by = auth.uid()::text)
  )
);

create policy "Teachers delete available activity items"
on public.activity_items for delete
to authenticated
using (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and public.current_user_role() = 'teacher'
      and (activities.visibility = 'shared' or activities.created_by = auth.uid()::text)
  )
);
