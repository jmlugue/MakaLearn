-- Remembers which activity belongs to a lesson, so "Open activity" no longer guesses by id or title.
alter table public.lessons
  add column if not exists related_activity_id text
  references public.activities(id) on delete set null;

-- Guide mode: the first-time tour and the hover explanations, on by default.
-- guide_seen holds the keys already shown ('welcome', 'content', 'activities', ...).
alter table public.user_settings
  add column if not exists guide_mode boolean not null default true,
  add column if not exists guide_seen text[] not null default '{}';
