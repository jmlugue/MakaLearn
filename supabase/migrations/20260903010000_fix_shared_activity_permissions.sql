-- Shared activities are collaborative teacher resources. Private activities
-- remain writable only by their creator (or an admin).

drop policy if exists "Role-aware write activities" on public.activities;
drop policy if exists "Authenticated write activity items" on public.activity_items;

create policy "Role-aware write activities"
on public.activities for all
to authenticated
using (
  public.current_user_role() = 'admin'
  or created_by = auth.uid()::text
  or visibility = 'shared'
)
with check (
  public.current_user_role() = 'admin'
  or created_by = auth.uid()::text
  or (visibility = 'shared' and created_by <> auth.uid()::text)
);

create policy "Authenticated write activity items"
on public.activity_items for all
to authenticated
using (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and (
        public.current_user_role() = 'admin'
        or activities.created_by = auth.uid()::text
        or activities.visibility = 'shared'
      )
  )
)
with check (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and (
        public.current_user_role() = 'admin'
        or activities.created_by = auth.uid()::text
        or (activities.visibility = 'shared' and activities.created_by <> auth.uid()::text)
      )
  )
);
