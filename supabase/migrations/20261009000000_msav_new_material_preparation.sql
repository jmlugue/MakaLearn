-- New teacher-created PECS materials are classified once for MSAV. Existing
-- manifest cards keep their source-controlled rules and are deliberately not
-- backfilled or sent to Gemini.
alter table public.learning_items
  add column if not exists playground_preparation_status text,
  add column if not exists msav_profile jsonb,
  add column if not exists playground_prepared_at timestamptz,
  add column if not exists playground_classifier_model text,
  add column if not exists playground_last_attempt_at timestamptz,
  add column if not exists playground_preparation_error text;

alter table public.learning_items
  drop constraint if exists learning_items_playground_preparation_status_check,
  add constraint learning_items_playground_preparation_status_check
    check (
      playground_preparation_status is null
      or playground_preparation_status in ('pending', 'processing', 'ready', 'unsupported')
    ),
  drop constraint if exists learning_items_msav_ready_profile_check,
  add constraint learning_items_msav_ready_profile_check
    check (
      playground_preparation_status <> 'ready'
      or (msav_profile is not null and jsonb_typeof(msav_profile) = 'object')
    );

create index if not exists learning_items_playground_status_idx
  on public.learning_items(playground_preparation_status)
  where playground_preparation_status is not null;

comment on column public.learning_items.playground_preparation_status is
  'AI preparation state for non-manifest PECS materials. NULL preserves built-in manifest behavior.';
comment on column public.learning_items.msav_profile is
  'Validated MSAV roles and semantic traits for a new teacher-created PECS material.';
