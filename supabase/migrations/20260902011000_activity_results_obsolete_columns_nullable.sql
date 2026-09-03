-- Older activity result experiments used extra required columns that the
-- Supabase-only app no longer writes. Keep any existing data, but stop those
-- obsolete columns from blocking current activity_results inserts.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'activity_results'
      and column_name = 'score_percentage'
      and is_nullable = 'NO'
  ) then
    alter table public.activity_results alter column score_percentage drop not null;
  end if;
end $$;
