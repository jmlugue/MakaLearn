-- Relax legacy activity result columns left by earlier MVP experiments.
-- The Supabase-only app records the activity through activity_results.activity_id.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activity_results'
      and column_name = 'activity_type'
      and is_nullable = 'NO'
  ) then
    alter table public.activity_results alter column activity_type drop not null;
  end if;
end $$;
