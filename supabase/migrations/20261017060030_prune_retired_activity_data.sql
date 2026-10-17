-- Keep enum labels for retired activities for history/older clients. Delete only unreferenced rows.
delete from public.activities a
where a.type in ('simple-quiz', 'choose-correct-symbol', 'gesture-practice')
  and not exists (select 1 from public.activity_results r where r.activity_id = a.id)
  and not exists (select 1 from public.lessons l where l.related_activity_id = a.id);

-- Current source uses v8. Keep future/current cache and all usage/quota events.
delete from public.activity_prompt_generations
where source = 'hugging-face'
  or (source = 'gemini' and prompt_template_version in
    ('activity-prompt-v1', 'activity-prompt-v2', 'activity-prompt-v3',
     'activity-prompt-v4', 'activity-prompt-v5', 'activity-prompt-v6', 'activity-prompt-v7'));
notify pgrst, 'reload schema';
