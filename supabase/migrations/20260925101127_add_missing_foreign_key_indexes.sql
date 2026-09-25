-- Cover foreign keys used by cascades, joins, and RLS relationship checks.
create index if not exists activity_items_activity_id_idx
  on public.activity_items(activity_id);
create index if not exists activity_items_learning_item_id_idx
  on public.activity_items(learning_item_id);
create index if not exists activity_prompt_templates_learning_item_id_idx
  on public.activity_prompt_templates(learning_item_id);
create index if not exists activity_results_activity_id_idx
  on public.activity_results(activity_id);
create index if not exists lesson_items_learning_item_id_idx
  on public.lesson_items(learning_item_id);
create index if not exists lessons_related_activity_id_idx
  on public.lessons(related_activity_id);
create index if not exists practice_attempts_learning_item_id_idx
  on public.practice_attempts(learning_item_id);
