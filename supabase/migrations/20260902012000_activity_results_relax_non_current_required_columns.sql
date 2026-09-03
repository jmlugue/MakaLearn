-- Relax a legacy activity_results column left by an earlier experiment.
-- The Supabase-only app stores the teacher in teacher_id.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activity_results'
      and column_name = 'saved_by'
      and is_nullable = 'NO'
  ) then
    alter table public.activity_results alter column saved_by drop not null;
  end if;
end $$;
