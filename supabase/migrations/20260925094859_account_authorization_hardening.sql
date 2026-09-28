-- Keep account identity and authorization fields under administrator control.
-- The service role is used only by guarded server routes for admin actions.
create or replace function private.protect_profile_admin_fields()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.id is distinct from old.id then
    raise exception 'Profile IDs cannot be changed';
  end if;

  if (select auth.role()) is distinct from 'service_role'
    and (select private.current_user_role()) is distinct from 'admin'::public.user_role
    and (
      new.email is distinct from old.email
      or new.role is distinct from old.role
      or new.status is distinct from old.status
      or new.created_at is distinct from old.created_at
    )
  then
    raise exception 'Only administrators can change account identity, role, or status';
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_admin_fields on public.profiles;
create trigger protect_profile_admin_fields
before update on public.profiles
for each row execute function private.protect_profile_admin_fields();

-- Profiles: users can edit ordinary fields on themselves; admins can manage
-- accounts. The trigger above protects role, status, email, and identity.
drop policy if exists "Authenticated users read own profile or admin reads all" on public.profiles;
drop policy if exists "Authenticated users update own profile or admin updates all" on public.profiles;
drop policy if exists "Admins insert profiles" on public.profiles;

create policy "Users read own profile or admins read all"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())::text
  or (select private.current_user_role()) = 'admin'
);

create policy "Users update own profile or admins update all"
on public.profiles for update to authenticated
using (
  id = (select auth.uid())::text
  or (select private.current_user_role()) = 'admin'
)
with check (
  id = (select auth.uid())::text
  or (select private.current_user_role()) = 'admin'
);

create policy "Admins insert profiles"
on public.profiles for insert to authenticated
with check ((select private.current_user_role()) = 'admin');

-- Learners remain assigned-teacher resources while admins retain reassignment
-- and oversight duties.
drop policy if exists "Role-aware read learners" on public.learners;
drop policy if exists "Role-aware insert learners" on public.learners;
drop policy if exists "Role-aware update learners" on public.learners;

create policy "Role-aware read learners"
on public.learners for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and assigned_teacher_id = (select auth.uid())::text
  )
);

create policy "Role-aware insert learners"
on public.learners for insert to authenticated
with check (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and assigned_teacher_id = (select auth.uid())::text
  )
);

create policy "Role-aware update learners"
on public.learners for update to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and assigned_teacher_id = (select auth.uid())::text
  )
)
with check (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and assigned_teacher_id = (select auth.uid())::text
  )
);

-- Remove duplicate legacy insert policies and prevent admins from fabricating
-- teacher practice/result records.
drop policy if exists "Authenticated insert practice attempts" on public.practice_attempts;
drop policy if exists "Teacher insert own practice attempts" on public.practice_attempts;
drop policy if exists "Teachers insert own practice attempts" on public.practice_attempts;
drop policy if exists "Role-aware read practice attempts" on public.practice_attempts;

create policy "Role-aware read practice attempts"
on public.practice_attempts for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and (
      teacher_id = (select auth.uid())::text
      or learner_id in (
        select id from public.learners
        where assigned_teacher_id = (select auth.uid())::text
      )
    )
  )
);

create policy "Teachers insert own practice attempts"
on public.practice_attempts for insert to authenticated
with check (
  (select private.current_user_role()) = 'teacher'
  and teacher_id = (select auth.uid())::text
);

drop policy if exists "Authenticated insert activity results" on public.activity_results;
drop policy if exists "Teacher insert own activity results" on public.activity_results;
drop policy if exists "Teachers insert own activity results" on public.activity_results;
drop policy if exists "Role-aware read activity results" on public.activity_results;

create policy "Role-aware read activity results"
on public.activity_results for select to authenticated
using (
  (select private.current_user_role()) = 'admin'
  or (
    (select private.current_user_role()) = 'teacher'
    and (
      teacher_id = (select auth.uid())::text
      or learner_id in (
        select id from public.learners
        where assigned_teacher_id = (select auth.uid())::text
      )
    )
  )
);

create policy "Teachers insert own activity results"
on public.activity_results for insert to authenticated
with check (
  (select private.current_user_role()) = 'teacher'
  and teacher_id = (select auth.uid())::text
);

drop policy if exists "Authenticated read own AI usage or admin reads all" on public.ai_usage_events;
drop policy if exists "Authenticated insert own AI usage" on public.ai_usage_events;
drop policy if exists "Users read own ai usage or admin reads all" on public.ai_usage_events;
drop policy if exists "Users insert own ai usage" on public.ai_usage_events;
drop policy if exists "Users read own AI usage or admins read all" on public.ai_usage_events;
drop policy if exists "Teachers insert own AI usage" on public.ai_usage_events;

create policy "Users read own AI usage or admins read all"
on public.ai_usage_events for select to authenticated
using (
  user_id = (select auth.uid())::text
  or (select private.current_user_role()) = 'admin'
);

create policy "Teachers insert own AI usage"
on public.ai_usage_events for insert to authenticated
with check (
  (select private.current_user_role()) = 'teacher'
  and user_id = (select auth.uid())::text
);

drop policy if exists "Admins read audit logs" on public.audit_logs;
drop policy if exists "Authenticated insert own audit logs" on public.audit_logs;
drop policy if exists "Active users insert own audit logs" on public.audit_logs;

create policy "Admins read audit logs"
on public.audit_logs for select to authenticated
using ((select private.current_user_role()) = 'admin');

create policy "Active users insert own audit logs"
on public.audit_logs for insert to authenticated
with check (
  (select private.current_user_role()) in ('admin', 'teacher')
  and actor_id = (select auth.uid())::text
);

drop policy if exists "Users manage own settings" on public.user_settings;
create policy "Users manage own settings"
on public.user_settings for all to authenticated
using (
  (select private.current_user_role()) in ('admin', 'teacher')
  and user_id = (select auth.uid())::text
)
with check (
  (select private.current_user_role()) in ('admin', 'teacher')
  and user_id = (select auth.uid())::text
);

-- No application code uses this exposed RPC. All policies now use the private
-- helper, so remove the public SECURITY DEFINER function completely.
drop function if exists public.current_user_role();
