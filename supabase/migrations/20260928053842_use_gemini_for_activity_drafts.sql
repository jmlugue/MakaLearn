-- Preserve historic Hugging Face rows while making Gemini the only provider
-- written by the current activity-drafting route.
alter type public.activity_prompt_source add value if not exists 'gemini';

alter table public.activity_prompt_generations
  drop constraint if exists activity_prompt_generations_source_check;

alter table public.activity_prompt_generations
  alter column source set default 'gemini';

alter table public.activity_prompt_generations
  add constraint activity_prompt_generations_source_check
  check (source in ('hugging-face', 'gemini'));
