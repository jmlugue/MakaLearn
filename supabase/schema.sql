-- MakaLearn initial Supabase schema.
-- Run this in the Supabase SQL editor before using the app with real accounts.
-- Profiles use auth.users.id stored as text so the client can join roles to sessions.

create extension if not exists pgcrypto;

create type public.user_role as enum ('admin', 'teacher');
create type public.profile_status as enum ('active', 'invited');
create type public.learner_status as enum ('active', 'inactive');
create type public.preferred_learning_mode as enum ('Visual', 'Audio', 'Gesture', 'Mixed', 'Teacher-guided');
create type public.media_asset_type as enum ('symbol-image', 'gesture-media', 'audio-file', 'learner-photo');
create type public.media_bucket as enum ('symbol-images', 'gesture-media', 'audio-files', 'learner-photos');
create type public.lesson_source as enum ('manual', 'auto-generated');
create type public.visibility_level as enum ('shared', 'private');
create type public.activity_type as enum (
  'match-word-symbol',
  'choose-correct-symbol',
  'fill-blank',
  'drag-drop-symbol',
  'gesture-practice',
  'simple-quiz'
);
create type public.practice_status as enum ('Correct', 'Good attempt', 'Needs practice', 'No hand detected');
create type public.audit_log_category as enum ('auth', 'content');
create type public.audit_log_action as enum ('login', 'logout', 'upload', 'create', 'edit', 'delete');

create table public.profiles (
  -- Store auth.users.id as text for straightforward client-side comparisons.
  id text primary key,
  name text not null,
  email text not null unique,
  role public.user_role not null default 'teacher',
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id text primary key default ('cat-' || gen_random_uuid()::text),
  name text not null,
  description text not null default '',
  color text not null default '#dbeafe',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learners (
  id text primary key default ('learner-' || gen_random_uuid()::text),
  name text not null,
  age int not null check (age > 0),
  grade_level text not null,
  communication_needs text not null default '',
  preferred_learning_mode public.preferred_learning_mode not null default 'Visual',
  assigned_teacher_id text not null,
  profile_photo_url text,
  status public.learner_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.learning_items (
  id text primary key default ('item-' || gen_random_uuid()::text),
  label text not null,
  category_id text not null references public.categories(id) on delete restrict,
  description text not null,
  instruction text not null,
  symbol_image_url text,
  gesture_media_url text,
  audio_url text,
  tags text[] not null default '{}',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.media_assets (
  id text primary key default ('media-' || gen_random_uuid()::text),
  title text not null,
  type public.media_asset_type not null,
  file_name text not null,
  bucket public.media_bucket not null,
  storage_path text not null,
  public_url text,
  uploaded_by text not null,
  uploaded_at timestamptz not null default now(),
  related_item_id text references public.learning_items(id) on delete set null
);

create table public.lessons (
  id text primary key default ('lesson-' || gen_random_uuid()::text),
  title text not null,
  objective text not null,
  instructions text not null,
  activity_type public.activity_type not null,
  estimated_duration int not null check (estimated_duration > 0),
  notes text not null default '',
  source public.lesson_source not null default 'manual',
  visibility public.visibility_level not null default 'shared',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.lesson_items (
  lesson_id text not null references public.lessons(id) on delete cascade,
  learning_item_id text not null references public.learning_items(id) on delete cascade,
  position int not null default 0,
  primary key (lesson_id, learning_item_id)
);

create table public.activities (
  id text primary key default ('activity-' || gen_random_uuid()::text),
  title text not null,
  type public.activity_type not null,
  prompt text not null,
  learning_item_ids text[] not null default '{}',
  visibility public.visibility_level not null default 'shared',
  created_by text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.activity_items (
  id text primary key default ('question-' || gen_random_uuid()::text),
  activity_id text not null references public.activities(id) on delete cascade,
  prompt text not null,
  answer text not null,
  options text[] not null default '{}',
  learning_item_id text not null references public.learning_items(id) on delete cascade,
  position int not null default 0
);

create table public.practice_attempts (
  id text primary key default ('attempt-' || gen_random_uuid()::text),
  learner_id text references public.learners(id) on delete set null,
  learning_item_id text not null references public.learning_items(id) on delete cascade,
  status public.practice_status not null,
  feedback text not null,
  attempted_at timestamptz not null default now(),
  saved_by text not null
);

create table public.activity_results (
  id text primary key default ('result-' || gen_random_uuid()::text),
  learner_id text references public.learners(id) on delete set null,
  activity_id text not null references public.activities(id) on delete cascade,
  activity_type public.activity_type not null,
  score_percentage numeric(5, 2) not null check (score_percentage >= 0 and score_percentage <= 100),
  correct_count int not null default 0,
  incorrect_count int not null default 0,
  time_spent_seconds int not null default 0,
  completed_at timestamptz not null default now(),
  related_learning_item_ids text[] not null default '{}',
  saved_by text not null
);

create table public.audit_logs (
  id text primary key default ('log-' || gen_random_uuid()::text),
  category public.audit_log_category not null,
  action public.audit_log_action not null,
  actor_id text not null,
  actor_name text not null,
  target_type text not null,
  target_id text,
  target_title text not null,
  detail text not null default '',
  created_at timestamptz not null default now()
);

create index categories_created_by_idx on public.categories(created_by);
create index learners_assigned_teacher_idx on public.learners(assigned_teacher_id);
create index learning_items_category_idx on public.learning_items(category_id);
create index media_assets_related_item_idx on public.media_assets(related_item_id);
create index practice_attempts_learner_idx on public.practice_attempts(learner_id);
create index activity_results_learner_idx on public.activity_results(learner_id);
create index audit_logs_created_at_idx on public.audit_logs(created_at desc);
create index audit_logs_category_action_idx on public.audit_logs(category, action);

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.learners enable row level security;
alter table public.learning_items enable row level security;
alter table public.media_assets enable row level security;
alter table public.lessons enable row level security;
alter table public.lesson_items enable row level security;
alter table public.activities enable row level security;
alter table public.activity_items enable row level security;
alter table public.practice_attempts enable row level security;
alter table public.activity_results enable row level security;
alter table public.audit_logs enable row level security;

create or replace function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()::text
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, name, email, role, status)
  values (
    new.id::text,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'teacher')::public.user_role,
    'active'
  )
  on conflict (id) do update
  set
    email = excluded.email,
    name = excluded.name,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

create policy "Authenticated users read own profile or admin reads all"
on public.profiles for select
to authenticated
using (id = auth.uid()::text or public.current_user_role() = 'admin');

create policy "Authenticated users update own profile or admin updates all"
on public.profiles for update
to authenticated
using (id = auth.uid()::text or public.current_user_role() = 'admin')
with check (id = auth.uid()::text or public.current_user_role() = 'admin');

create policy "Admins insert profiles"
on public.profiles for insert
to authenticated
with check (public.current_user_role() = 'admin');

create policy "Authenticated read categories" on public.categories for select to authenticated using (true);
create policy "Authenticated write categories" on public.categories for all to authenticated using (true) with check (true);

create policy "Role-aware read learners"
on public.learners for select
to authenticated
using (public.current_user_role() = 'admin' or assigned_teacher_id = auth.uid()::text);

create policy "Role-aware insert learners"
on public.learners for insert
to authenticated
with check (public.current_user_role() = 'admin' or assigned_teacher_id = auth.uid()::text);

create policy "Role-aware update learners"
on public.learners for update
to authenticated
using (public.current_user_role() = 'admin' or assigned_teacher_id = auth.uid()::text)
with check (public.current_user_role() = 'admin' or assigned_teacher_id = auth.uid()::text);

create policy "Authenticated read learning items" on public.learning_items for select to authenticated using (true);
create policy "Authenticated write learning items" on public.learning_items for all to authenticated using (true) with check (true);

create policy "Authenticated read media assets" on public.media_assets for select to authenticated using (true);
create policy "Authenticated write media assets" on public.media_assets for all to authenticated using (true) with check (true);

create policy "Authenticated read lessons" on public.lessons for select to authenticated using (true);
create policy "Authenticated write lessons" on public.lessons for all to authenticated using (true) with check (true);

create policy "Authenticated read lesson items" on public.lesson_items for select to authenticated using (true);
create policy "Authenticated write lesson items" on public.lesson_items for all to authenticated using (true) with check (true);

create policy "Authenticated read activities" on public.activities for select to authenticated using (true);
create policy "Authenticated write activities" on public.activities for all to authenticated using (true) with check (true);

create policy "Authenticated read activity items" on public.activity_items for select to authenticated using (true);
create policy "Authenticated write activity items" on public.activity_items for all to authenticated using (true) with check (true);

create policy "Role-aware read practice attempts"
on public.practice_attempts for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or saved_by = auth.uid()::text
  or learner_id in (select id from public.learners where assigned_teacher_id = auth.uid()::text)
);

create policy "Authenticated insert practice attempts"
on public.practice_attempts for insert
to authenticated
with check (saved_by = auth.uid()::text);

create policy "Role-aware read activity results"
on public.activity_results for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or saved_by = auth.uid()::text
  or learner_id in (select id from public.learners where assigned_teacher_id = auth.uid()::text)
);

create policy "Authenticated insert activity results"
on public.activity_results for insert
to authenticated
with check (saved_by = auth.uid()::text);

create policy "Admins read audit logs"
on public.audit_logs for select
to authenticated
using (public.current_user_role() = 'admin');

create policy "Authenticated insert own audit logs"
on public.audit_logs for insert
to authenticated
with check (actor_id = auth.uid()::text);
