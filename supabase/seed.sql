-- MakaLearn placeholder seed data.
-- These records mirror the local placeholder data and are not official Makaton content.
-- Create the two Supabase Auth users first, then run this file:
-- admin@makalearn.local with role metadata "admin"
-- teacher@makalearn.local with role metadata "teacher"

update public.profiles
set name = 'Amina Reyes', role = 'admin', status = 'active', updated_at = now()
where email = 'admin@makalearn.local';

update public.profiles
set name = 'Jordan Lee', role = 'teacher', status = 'active', updated_at = now()
where email = 'teacher@makalearn.local';

insert into public.categories (id, name, description, color, created_by)
values
  ('cat-greetings', 'Greetings', 'Placeholder words for social classroom routines.', '#dbeafe', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher')),
  ('cat-needs', 'Needs', 'Placeholder words for everyday requests and support.', '#dcfce7', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher')),
  ('cat-feelings', 'Feelings', 'Placeholder words for emotional check-ins.', '#fee2e2', coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('cat-choices', 'Choices', 'Placeholder words for quick answers.', '#fef3c7', coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin'))
on conflict (id) do nothing;

insert into public.learning_items (
  id,
  label,
  category_id,
  description,
  instruction,
  symbol_image_url,
  gesture_media_url,
  audio_url,
  tags,
  created_by
)
values
  ('item-hello', 'Hello', 'cat-greetings', 'A friendly greeting used when entering class.', 'Model the greeting and invite the learner to respond.', 'HEL', 'Gesture placeholder', 'hello-placeholder.mp3', array['social', 'arrival', 'placeholder'], coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher')),
  ('item-eat', 'Eat', 'cat-needs', 'A classroom request used around snack or lunch.', 'Pair the spoken word with a picture prompt and gesture practice.', 'EAT', 'Gesture placeholder', 'eat-placeholder.mp3', array['needs', 'food', 'placeholder'], coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher')),
  ('item-drink', 'Drink', 'cat-needs', 'A request for water or another drink.', 'Use a real cup or photo card as a prompt.', 'DRK', 'Gesture placeholder', 'drink-placeholder.mp3', array['needs', 'drink', 'placeholder'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin'))
on conflict (id) do nothing;

insert into public.learners (
  id,
  name,
  age,
  grade_level,
  communication_needs,
  preferred_learning_mode,
  assigned_teacher_id,
  profile_photo_url,
  status
)
values
  ('learner-ella', 'Ella M.', 7, 'Primary 2', 'Benefits from visual prompts and repeated modeling.', 'Visual', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'), '/placeholder-learner-1', 'active'),
  ('learner-noah', 'Noah K.', 9, 'Primary 4', 'Responds well to short audio cues and gesture practice.', 'Mixed', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'), '/placeholder-learner-2', 'active')
on conflict (id) do nothing;

insert into public.lessons (
  id,
  title,
  objective,
  instructions,
  activity_type,
  estimated_duration,
  notes,
  source,
  visibility,
  created_by
)
values
  ('lesson-needs', 'Snack Time Requests', 'Practice requesting food, drink, and more during a guided routine.', 'Model each item, ask the learner to choose, then run a short quiz.', 'choose-correct-symbol', 15, 'Use classroom objects where possible.', 'manual', 'shared', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'))
on conflict (id) do nothing;

insert into public.lesson_items (lesson_id, learning_item_id, position)
values
  ('lesson-needs', 'item-eat', 0),
  ('lesson-needs', 'item-drink', 1)
on conflict (lesson_id, learning_item_id) do nothing;

insert into public.activities (
  id,
  title,
  type,
  prompt,
  learning_item_ids,
  visibility,
  created_by
)
values
  ('activity-match', 'Match Words to Placeholder Symbols', 'match-word-symbol', 'Pick the matching placeholder symbol for each word.', array['item-hello', 'item-eat', 'item-drink'], 'shared', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher')),
  ('activity-choice', 'Choose the Correct Symbol', 'choose-correct-symbol', 'Listen to the teacher prompt and choose the correct placeholder symbol.', array['item-hello', 'item-eat', 'item-drink'], 'shared', coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin'))
on conflict (id) do nothing;

insert into public.activity_items (id, activity_id, prompt, answer, options, learning_item_id, position)
values
  ('q-match-hello', 'activity-match', 'Hello', 'HEL', array['HEL', 'EAT', 'DRK'], 'item-hello', 0),
  ('q-match-eat', 'activity-match', 'Eat', 'EAT', array['HEL', 'EAT', 'DRK'], 'item-eat', 1),
  ('q-choice-drink', 'activity-choice', 'Choose Drink', 'DRK', array['HEL', 'EAT', 'DRK'], 'item-drink', 0)
on conflict (id) do nothing;

insert into public.practice_attempts (
  id,
  learner_id,
  learning_item_id,
  status,
  feedback,
  attempted_at,
  saved_by
)
values
  ('attempt-1', 'learner-ella', 'item-hello', 'Correct', 'Clear start and finish. Keep the pace steady.', '2026-06-02T10:00:00.000Z', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher')),
  ('attempt-2', 'learner-noah', 'item-eat', 'Good attempt', 'Good effort. Try holding the final position a little longer.', '2026-06-03T11:15:00.000Z', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'))
on conflict (id) do nothing;

insert into public.activity_results (
  id,
  learner_id,
  activity_id,
  activity_type,
  score_percentage,
  correct_count,
  incorrect_count,
  time_spent_seconds,
  completed_at,
  related_learning_item_ids,
  saved_by
)
values
  ('result-1', 'learner-ella', 'activity-match', 'match-word-symbol', 100, 2, 0, 110, '2026-06-04T09:10:00.000Z', array['item-hello', 'item-eat'], coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher')),
  ('result-2', 'learner-noah', 'activity-choice', 'choose-correct-symbol', 50, 1, 1, 150, '2026-06-06T09:35:00.000Z', array['item-drink'], coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'))
on conflict (id) do nothing;
