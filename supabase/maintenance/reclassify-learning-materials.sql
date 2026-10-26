-- Reviewed against all 67 saved materials on 2026-10-26.
-- Data maintenance only: no schema, roles, media paths, or activity records change.
-- Re-running is safe: only the explicitly reviewed source categories are updated.
begin;

insert into public.categories (id, name, description, color, created_by)
select v.id, v.name, v.description, v.color, owner.created_by
from (values
  ('cat-pecs-polite-words', 'Polite Words', 'Polite requests, thanks, and apologies.', '#e0f2fe'),
  ('cat-pecs-people', 'People', 'Familiar people and roles outside the family.', '#cffafe'),
  ('cat-pecs-health', 'Health', 'Physical conditions, discomfort, and care needs.', '#ffe4e6')
) as v(id, name, description, color)
cross join (select created_by from public.categories where id = 'cat-pecs-greetings') owner
on conflict (id) do nothing;

-- Remove only the former category tag; grammatical/semantic roles are independent.
-- Replace descriptions only when they exactly match the old generated template.
-- Teacher-edited descriptions (including Sick) are kept.
with moves(id, label, old_category, new_category, old_tag, new_tag, old_description, new_description) as (
  values
    ('item-drink', 'Drink', 'cat-needs', 'cat-pecs-food', 'needs', 'food', '', ''),
    ('item-eat', 'Eat', 'cat-needs', 'cat-pecs-food', 'needs', 'food', '', ''),
    ('pecs-am', 'Am', 'cat-pecs-daily-needs', 'cat-pecs-grammar', 'daily needs', 'grammar', 'Use when the learner needs am or wants to communicate an everyday request.', 'Use "Am" when building English phrases and sentences.'),
    ('pecs-are', 'Are', 'cat-pecs-daily-needs', 'cat-pecs-grammar', 'daily needs', 'grammar', 'Use when the learner needs are or wants to communicate an everyday request.', 'Use "Are" when building English phrases and sentences.'),
    ('pecs-friend', 'Friend', 'cat-pecs-family', 'cat-pecs-people', 'family', 'people', 'Use when the learner is talking about friend or identifying familiar people.', 'Use "Friend" to identify a familiar person or talk about people at school.'),
    ('pecs-hurt', 'Hurt', 'cat-pecs-safety-words', 'cat-pecs-health', 'safety words', 'health', 'Use when the learner needs to communicate "Hurt" during safety, discomfort, or urgent classroom situations.', 'Use "Hurt" to communicate a physical condition, discomfort, or a need for care.'),
    ('pecs-i', 'I', 'cat-pecs-family', 'cat-pecs-grammar', 'family', 'grammar', 'Use when the learner is talking about i or identifying familiar people.', 'Use "I" when building English phrases and sentences.'),
    ('pecs-is', 'Is', 'cat-pecs-daily-needs', 'cat-pecs-grammar', 'daily needs', 'grammar', 'Use when the learner needs is or wants to communicate an everyday request.', 'Use "Is" when building English phrases and sentences.'),
    ('pecs-no', 'No', 'cat-pecs-safety-words', 'cat-choices', 'safety words', 'choices', 'Use when the learner needs to communicate "No" during safety, discomfort, or urgent classroom situations.', 'Use "No" to answer a question, accept, or refuse.'),
    ('pecs-please', 'Please', 'cat-pecs-greetings', 'cat-pecs-polite-words', 'greetings', 'polite words', 'Use when greeting someone, saying goodbye, or starting a classroom interaction with "Please".', 'Use "Please" when making a polite request, thanking someone, or apologising.'),
    ('pecs-sick', 'Sick', 'cat-pecs-emotions', 'cat-pecs-health', 'emotions', 'health', 'Use when the learner needs to express feeling sick or talk about emotions.', 'Use "Sick" to communicate a physical condition, discomfort, or a need for care.'),
    ('pecs-sorry', 'Sorry', 'cat-pecs-greetings', 'cat-pecs-polite-words', 'greetings', 'polite words', 'Use when greeting someone, saying goodbye, or starting a classroom interaction with "Sorry".', 'Use "Sorry" when making a polite request, thanking someone, or apologising.'),
    ('pecs-teacher', 'Teacher', 'cat-pecs-family', 'cat-pecs-people', 'family', 'people', 'Use when the learner is talking about teacher or identifying familiar people.', 'Use "Teacher" to identify a familiar person or talk about people at school.'),
    ('pecs-thank-you', 'Thank you', 'cat-pecs-greetings', 'cat-pecs-polite-words', 'greetings', 'polite words', 'Use when greeting someone, saying goodbye, or starting a classroom interaction with "Thank you".', 'Use "Thank you" when making a polite request, thanking someone, or apologising.'),
    ('pecs-tired', 'Tired', 'cat-pecs-emotions', 'cat-pecs-health', 'emotions', 'health', 'Use when the learner needs to express feeling tired or talk about emotions.', 'Use "Tired" to communicate a physical condition, discomfort, or a need for care.'),
    ('pecs-yes', 'Yes', 'cat-pecs-safety-words', 'cat-choices', 'safety words', 'choices', 'Use when the learner needs to communicate "Yes" during safety, discomfort, or urgent classroom situations.', 'Use "Yes" to answer a question, accept, or refuse.'),
    ('pecs-you', 'You', 'cat-pecs-family', 'cat-pecs-grammar', 'family', 'grammar', 'Use when the learner is talking about you or identifying familiar people.', 'Use "You" when building English phrases and sentences.')
)
update public.learning_items l
set category_id = m.new_category,
    tags = case when l.id like 'pecs-%'
      then array_append(array_remove(array_remove(l.tags, m.old_tag), m.new_tag), m.new_tag)
      else l.tags end,
    description = case when m.old_description <> '' and l.description = m.old_description
      then m.new_description else l.description end,
    updated_at = now()
from moves m
where l.id = m.id and l.label = m.label and l.content_type = 'pecs'
  and l.category_id = m.old_category;

commit;
