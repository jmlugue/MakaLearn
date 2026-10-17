-- Current writes use teacher_id, score, counts, answers and created_at only.
-- Explicitly abort if any legacy column has acquired information worth preserving.
do $$
begin
  if exists (select 1 from public.activity_results where
    activity_type is not null or score_percentage is not null or saved_by is not null
    or time_spent_seconds <> 0 or completed_at is distinct from created_at) then
    raise exception 'Legacy result fields contain nonredundant data; review before removal';
  end if;
end $$;
alter table public.activity_results
  drop column activity_type,
  drop column score_percentage,
  drop column saved_by,
  drop column time_spent_seconds,
  drop column completed_at;
notify pgrst, 'reload schema';
