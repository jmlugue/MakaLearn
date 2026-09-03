-- MakaLearn Supabase-only migration.
-- Upgrades the earlier MVP schema without deleting data.

create extension if not exists pgcrypto;

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'content_type') then
    create type public.content_type as enum ('pecs', 'gesture');
  end if;
end $$;

alter type public.profile_status add value if not exists 'deactivated';
alter type public.audit_log_category add value if not exists 'activity';
alter type public.audit_log_category add value if not exists 'gesture';
alter type public.audit_log_category add value if not exists 'settings';
alter type public.audit_log_category add value if not exists 'admin';

do $$
begin
  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'sentence_role') then
    create type public.sentence_role as enum (
      'subject',
      'verb',
      'object',
      'emotion',
      'command',
      'greeting',
      'response',
      'polite_word',
      'be_verb',
      'safety_word'
    );
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'practice_attempt_status') then
    create type public.practice_attempt_status as enum ('correct', 'good-attempt', 'needs-practice', 'no-hand-detected');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'activity_prompt_source') then
    create type public.activity_prompt_source as enum ('hugging-face', 'local-fallback', 'manual');
  end if;

  if not exists (select 1 from pg_type where typnamespace = 'public'::regnamespace and typname = 'ai_usage_status') then
    create type public.ai_usage_status as enum ('success', 'fallback', 'error', 'skipped');
  end if;
end $$;

alter table public.learning_items
  add column if not exists content_type public.content_type not null default 'pecs',
  add column if not exists sentence_role public.sentence_role;

update public.learning_items
set content_type = 'gesture'
where 'gesture' = any(tags);

create table if not exists public.practice_attempts (
  id text primary key default ('attempt-' || gen_random_uuid()::text),
  learner_id text references public.learners(id) on delete set null,
  learning_item_id text not null references public.learning_items(id) on delete cascade,
  teacher_id text not null references public.profiles(id) on delete cascade,
  status public.practice_attempt_status not null,
  feedback text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.activity_results (
  id text primary key default ('result-' || gen_random_uuid()::text),
  activity_id text not null references public.activities(id) on delete cascade,
  learner_id text references public.learners(id) on delete set null,
  teacher_id text not null references public.profiles(id) on delete cascade,
  score int not null check (score >= 0 and score <= 100),
  correct_count int not null check (correct_count >= 0),
  incorrect_count int not null check (incorrect_count >= 0),
  answers jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.activity_prompt_templates (
  id text primary key default ('prompt-' || gen_random_uuid()::text),
  activity_type public.activity_type not null,
  learning_item_id text not null references public.learning_items(id) on delete cascade,
  prompt text not null,
  source public.activity_prompt_source not null default 'manual',
  created_by text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (activity_type, learning_item_id)
);

create table if not exists public.activity_prompt_generations (
  id text primary key default ('prompt-generation-' || gen_random_uuid()::text),
  activity_type public.activity_type not null check (activity_type in ('choose-correct-symbol', 'fill-blank')),
  material_hash text not null,
  prompt_template_version text not null,
  learning_item_ids text[] not null default '{}',
  prompts jsonb not null check (jsonb_typeof(prompts) = 'array'),
  source text not null default 'hugging-face' check (source = 'hugging-face'),
  model text not null,
  version int not null check (version > 0),
  created_by text not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (activity_type, material_hash, prompt_template_version, version)
);

create table if not exists public.ai_usage_events (
  id text primary key default ('ai-' || gen_random_uuid()::text),
  user_id text not null references public.profiles(id) on delete cascade,
  feature text not null default 'activity-draft',
  activity_type public.activity_type check (activity_type in ('choose-correct-symbol', 'fill-blank')),
  material_hash text,
  event_type text not null check (
    event_type in ('cache-hit', 'model-request', 'model-success', 'model-failure', 'rate-limited', 'fallback-used')
  ),
  model text not null default '',
  created_at timestamptz not null default now()
);

alter table public.ai_usage_events
  add column if not exists id text default ('ai-' || gen_random_uuid()::text),
  add column if not exists user_id text references public.profiles(id) on delete cascade,
  add column if not exists feature text not null default 'activity-draft',
  add column if not exists activity_type public.activity_type,
  add column if not exists material_hash text,
  add column if not exists event_type text,
  add column if not exists model text not null default '',
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'ai_usage_events' and column_name = 'status'
  ) then
    alter table public.ai_usage_events alter column status drop not null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.ai_usage_events'::regclass and conname = 'ai_usage_events_event_type_check'
  ) then
    alter table public.ai_usage_events
      add constraint ai_usage_events_event_type_check
      check (event_type in ('cache-hit', 'model-request', 'model-success', 'model-failure', 'rate-limited', 'fallback-used'));
  end if;
end $$;

create table if not exists public.user_settings (
  user_id text primary key references public.profiles(id) on delete cascade,
  large_text boolean not null default false,
  high_contrast boolean not null default false,
  reduce_motion boolean not null default false,
  audio_guidance boolean not null default true,
  theme text not null default 'soft-blue' check (theme in ('soft-blue', 'high-contrast')),
  updated_at timestamptz not null default now()
);

alter table public.practice_attempts
  add column if not exists id text default ('attempt-' || gen_random_uuid()::text),
  add column if not exists learner_id text references public.learners(id) on delete set null,
  add column if not exists learning_item_id text references public.learning_items(id) on delete cascade,
  add column if not exists teacher_id text references public.profiles(id) on delete cascade,
  add column if not exists status public.practice_attempt_status,
  add column if not exists feedback text not null default '',
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'practice_attempts' and column_name = 'user_id'
  ) then
    execute 'update public.practice_attempts set teacher_id = user_id where teacher_id is null';
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'practice_attempts'
      and column_name = 'status'
      and udt_name <> 'practice_attempt_status'
  ) then
    if exists (select 1 from public.practice_attempts limit 1) then
      raise exception 'practice_attempts.status uses an older enum and the table contains data. Inspect existing status values before converting to public.practice_attempt_status.';
    end if;

    alter table public.practice_attempts alter column status drop not null;
    alter table public.practice_attempts alter column status drop default;
    alter table public.practice_attempts
      alter column status type public.practice_attempt_status
      using null::public.practice_attempt_status;
  end if;
end $$;

update public.practice_attempts set feedback = '' where feedback is null;

alter table public.activity_results
  add column if not exists id text default ('result-' || gen_random_uuid()::text),
  add column if not exists activity_id text references public.activities(id) on delete cascade,
  add column if not exists learner_id text references public.learners(id) on delete set null,
  add column if not exists teacher_id text references public.profiles(id) on delete cascade,
  add column if not exists score int,
  add column if not exists correct_count int,
  add column if not exists incorrect_count int,
  add column if not exists answers jsonb not null default '{}'::jsonb,
  add column if not exists created_at timestamptz not null default now();

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public' and table_name = 'activity_results' and column_name = 'user_id'
  ) then
    execute 'update public.activity_results set teacher_id = user_id where teacher_id is null';
  end if;
end $$;

update public.activity_results set score = 0 where score is null;
update public.activity_results set correct_count = 0 where correct_count is null;
update public.activity_results set incorrect_count = 0 where incorrect_count is null;

alter table public.activity_prompt_templates
  add column if not exists id text default ('prompt-' || gen_random_uuid()::text),
  add column if not exists activity_type public.activity_type,
  add column if not exists learning_item_id text references public.learning_items(id) on delete cascade,
  add column if not exists prompt text,
  add column if not exists source public.activity_prompt_source not null default 'manual',
  add column if not exists created_by text references public.profiles(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now(),
  add column if not exists updated_at timestamptz not null default now();

create unique index if not exists activity_prompt_templates_activity_type_learning_item_id_unique
  on public.activity_prompt_templates(activity_type, learning_item_id);

alter table public.activity_prompt_generations
  add column if not exists id text default ('prompt-generation-' || gen_random_uuid()::text),
  add column if not exists activity_type public.activity_type,
  add column if not exists material_hash text,
  add column if not exists prompt_template_version text,
  add column if not exists learning_item_ids text[] not null default '{}',
  add column if not exists prompts jsonb,
  add column if not exists source text not null default 'hugging-face',
  add column if not exists model text not null default '',
  add column if not exists version int,
  add column if not exists created_by text references public.profiles(id) on delete cascade,
  add column if not exists created_at timestamptz not null default now();

create unique index if not exists activity_prompt_generations_version_unique
  on public.activity_prompt_generations(activity_type, material_hash, prompt_template_version, version);

create index if not exists learning_items_content_type_idx on public.learning_items(content_type);
create index if not exists practice_attempts_teacher_idx on public.practice_attempts(teacher_id, created_at desc);
create index if not exists practice_attempts_learner_idx on public.practice_attempts(learner_id, created_at desc);
create index if not exists activity_results_teacher_idx on public.activity_results(teacher_id, created_at desc);
create index if not exists activity_results_learner_idx on public.activity_results(learner_id, created_at desc);
create index if not exists activity_prompt_templates_lookup_idx on public.activity_prompt_templates(activity_type, learning_item_id);
create index if not exists activity_prompt_generations_lookup_idx
  on public.activity_prompt_generations(activity_type, material_hash, prompt_template_version, version desc);
create index if not exists activity_prompt_generations_created_by_idx on public.activity_prompt_generations(created_by);
create index if not exists ai_usage_events_user_feature_created_idx on public.ai_usage_events(user_id, feature, created_at desc);
create index if not exists ai_usage_events_material_created_idx on public.ai_usage_events(material_hash, created_at desc);
create index if not exists ai_usage_events_user_created_idx on public.ai_usage_events(user_id, created_at desc);

alter table public.practice_attempts enable row level security;
alter table public.activity_results enable row level security;
alter table public.activity_prompt_templates enable row level security;
alter table public.activity_prompt_generations enable row level security;
alter table public.ai_usage_events enable row level security;
alter table public.user_settings enable row level security;

drop policy if exists "Authenticated write categories" on public.categories;
drop policy if exists "Authenticated write learning items" on public.learning_items;
drop policy if exists "Authenticated write media assets" on public.media_assets;
drop policy if exists "Authenticated write lessons" on public.lessons;
drop policy if exists "Authenticated write lesson items" on public.lesson_items;
drop policy if exists "Authenticated write activities" on public.activities;
drop policy if exists "Authenticated write activity items" on public.activity_items;
drop policy if exists "Role-aware write categories" on public.categories;
drop policy if exists "Role-aware write learning items" on public.learning_items;
drop policy if exists "Role-aware write media assets" on public.media_assets;
drop policy if exists "Role-aware write lessons" on public.lessons;
drop policy if exists "Role-aware write activities" on public.activities;
drop policy if exists "Role-aware read practice attempts" on public.practice_attempts;
drop policy if exists "Teacher insert own practice attempts" on public.practice_attempts;
drop policy if exists "Role-aware read activity results" on public.activity_results;
drop policy if exists "Teacher insert own activity results" on public.activity_results;
drop policy if exists "Authenticated read prompt templates" on public.activity_prompt_templates;
drop policy if exists "Role-aware write prompt templates" on public.activity_prompt_templates;
drop policy if exists "Users manage own settings" on public.user_settings;

create policy "Role-aware write categories"
on public.categories for all
to authenticated
using (public.current_user_role() = 'admin' or created_by = auth.uid()::text)
with check (public.current_user_role() = 'admin' or created_by = auth.uid()::text);

create policy "Role-aware write learning items"
on public.learning_items for all
to authenticated
using (public.current_user_role() = 'admin' or created_by = auth.uid()::text)
with check (public.current_user_role() = 'admin' or created_by = auth.uid()::text);

create policy "Role-aware write media assets"
on public.media_assets for all
to authenticated
using (public.current_user_role() = 'admin' or uploaded_by = auth.uid()::text)
with check (public.current_user_role() = 'admin' or uploaded_by = auth.uid()::text);

create policy "Role-aware write lessons"
on public.lessons for all
to authenticated
using (public.current_user_role() = 'admin' or created_by = auth.uid()::text)
with check (public.current_user_role() = 'admin' or created_by = auth.uid()::text);

create policy "Authenticated write lesson items"
on public.lesson_items for all
to authenticated
using (
  exists (
    select 1
    from public.lessons
    where lessons.id = lesson_items.lesson_id
      and (public.current_user_role() = 'admin' or lessons.created_by = auth.uid()::text)
  )
)
with check (
  exists (
    select 1
    from public.lessons
    where lessons.id = lesson_items.lesson_id
      and (public.current_user_role() = 'admin' or lessons.created_by = auth.uid()::text)
  )
);

create policy "Role-aware write activities"
on public.activities for all
to authenticated
using (public.current_user_role() = 'admin' or created_by = auth.uid()::text)
with check (public.current_user_role() = 'admin' or created_by = auth.uid()::text);

create policy "Authenticated write activity items"
on public.activity_items for all
to authenticated
using (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and (public.current_user_role() = 'admin' or activities.created_by = auth.uid()::text)
  )
)
with check (
  exists (
    select 1
    from public.activities
    where activities.id = activity_items.activity_id
      and (public.current_user_role() = 'admin' or activities.created_by = auth.uid()::text)
  )
);

create policy "Role-aware read practice attempts"
on public.practice_attempts for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or teacher_id = auth.uid()::text
  or learner_id in (select id from public.learners where assigned_teacher_id = auth.uid()::text)
);

create policy "Teacher insert own practice attempts"
on public.practice_attempts for insert
to authenticated
with check (teacher_id = auth.uid()::text or public.current_user_role() = 'admin');

create policy "Role-aware read activity results"
on public.activity_results for select
to authenticated
using (
  public.current_user_role() = 'admin'
  or teacher_id = auth.uid()::text
  or learner_id in (select id from public.learners where assigned_teacher_id = auth.uid()::text)
);

create policy "Teacher insert own activity results"
on public.activity_results for insert
to authenticated
with check (teacher_id = auth.uid()::text or public.current_user_role() = 'admin');

create policy "Authenticated read prompt templates"
on public.activity_prompt_templates for select
to authenticated
using (true);

create policy "Role-aware write prompt templates"
on public.activity_prompt_templates for all
to authenticated
using (public.current_user_role() = 'admin' or created_by = auth.uid()::text)
with check (public.current_user_role() = 'admin' or created_by = auth.uid()::text);

drop policy if exists "Authenticated read AI prompt generations" on public.activity_prompt_generations;
drop policy if exists "Authenticated insert own AI prompt generations" on public.activity_prompt_generations;
drop policy if exists "Authenticated read own AI usage or admin reads all" on public.ai_usage_events;
drop policy if exists "Authenticated insert own AI usage" on public.ai_usage_events;
drop policy if exists "Users read own ai usage or admin reads all" on public.ai_usage_events;
drop policy if exists "Users insert own ai usage" on public.ai_usage_events;

create policy "Authenticated read AI prompt generations"
on public.activity_prompt_generations for select
to authenticated
using (true);

create policy "Authenticated insert own AI prompt generations"
on public.activity_prompt_generations for insert
to authenticated
with check (created_by = auth.uid()::text or public.current_user_role() = 'admin');

create policy "Authenticated read own AI usage or admin reads all"
on public.ai_usage_events for select
to authenticated
using (user_id = auth.uid()::text or public.current_user_role() = 'admin');

create policy "Authenticated insert own AI usage"
on public.ai_usage_events for insert
to authenticated
with check (user_id = auth.uid()::text or public.current_user_role() = 'admin');

create policy "Users manage own settings"
on public.user_settings for all
to authenticated
using (user_id = auth.uid()::text or public.current_user_role() = 'admin')
with check (user_id = auth.uid()::text or public.current_user_role() = 'admin');
