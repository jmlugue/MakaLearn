-- MakaLearn placeholder seed data.
-- These records mirror the local placeholder data and are not official Makaton content.
-- Create the two Supabase Auth users first, then run this file:
-- admin@makalearn.local with role metadata "admin"
-- teacher@makalearn.local with role metadata "teacher"

do $$
begin
  if not exists (select 1 from public.profiles where email = 'admin@makalearn.local') then
    raise exception 'Create the admin@makalearn.local Supabase Auth user before running supabase/seed.sql.';
  end if;

  if not exists (select 1 from public.profiles where email = 'teacher@makalearn.local') then
    raise exception 'Create the teacher@makalearn.local Supabase Auth user before running supabase/seed.sql.';
  end if;
end $$;

update public.profiles
set name = 'Amina Reyes', role = 'admin', status = 'active', updated_at = now()
where email = 'admin@makalearn.local';

update public.profiles
set name = 'Jordan Lee', role = 'teacher', status = 'active', updated_at = now()
where email = 'teacher@makalearn.local';

insert into public.categories (id, name, description, color, created_by)
values
  ('cat-needs', 'Needs', 'Placeholder words for everyday requests and support.', '#dcfce7', (select id from public.profiles where email = 'teacher@makalearn.local')),
  ('cat-feelings', 'Feelings', 'Placeholder words for emotional check-ins.', '#fee2e2', (select id from public.profiles where email = 'admin@makalearn.local')),
  ('cat-choices', 'Choices', 'Placeholder words for quick answers.', '#fef3c7', (select id from public.profiles where email = 'admin@makalearn.local')),
  ('cat-gestures', 'Fixed gestures', 'The seven placeholder gesture cards used by gesture recognition.', '#dcfce7', (select id from public.profiles where email = 'admin@makalearn.local'))
on conflict (id) do nothing;

insert into public.learning_items (
  id,
  content_type,
  label,
  category_id,
  description,
  instruction,
  symbol_image_url,
  gesture_media_url,
  audio_url,
  tags,
  sentence_role,
  created_by
)
values
  ('item-eat', 'pecs', 'Eat', 'cat-needs', 'A classroom request used around snack or lunch.', 'Pair the spoken word with a picture prompt and gesture practice.', 'https://tjqwyogtawkhyviljzrr.supabase.co/storage/v1/object/public/symbol-images/learning-content/pecs/generated-cards/eat.png', null, null, array['needs', 'food', 'placeholder'], 'verb', (select id from public.profiles where email = 'teacher@makalearn.local')),
  ('item-drink', 'pecs', 'Drink', 'cat-needs', 'A request for water or another drink.', 'Use a real cup or photo card as a prompt.', 'https://tjqwyogtawkhyviljzrr.supabase.co/storage/v1/object/public/symbol-images/learning-content/pecs/generated-cards/drink.png', null, null, array['needs', 'drink', 'placeholder'], 'object', (select id from public.profiles where email = 'admin@makalearn.local')),
  ('gesture-toilet', 'gesture', 'I want to go to toilet', 'cat-gestures', 'Fixed demo gesture for requesting the toilet.', 'Show the reference, start the camera, and check that both hands remain visible.', null, null, null, array['gesture', 'fixed', 'demo'], null, (select id from public.profiles where email = 'admin@makalearn.local')),
  ('gesture-eat-food', 'gesture', 'I want to eat food', 'cat-gestures', 'Fixed demo gesture for requesting food.', 'Keep the learner centered and check that the live hand outline follows the movement.', null, null, null, array['gesture', 'fixed', 'demo'], null, (select id from public.profiles where email = 'admin@makalearn.local')),
  ('gesture-drink-water', 'gesture', 'I want to drink water', 'cat-gestures', 'Fixed demo gesture for requesting water.', 'Use the hand visibility indicator before giving corrective feedback.', null, null, null, array['gesture', 'fixed', 'demo'], null, (select id from public.profiles where email = 'admin@makalearn.local')),
  ('gesture-help', 'gesture', 'Help', 'cat-gestures', 'Fixed demo gesture for requesting help.', 'Ask the learner to repeat slowly if the hand detector loses visibility.', null, null, null, array['gesture', 'fixed', 'demo'], null, (select id from public.profiles where email = 'admin@makalearn.local')),
  ('gesture-yes', 'gesture', 'Yes', 'cat-gestures', 'Fixed demo gesture for yes.', 'Start only when the camera shows one person in frame.', null, null, null, array['gesture', 'fixed', 'demo'], null, (select id from public.profiles where email = 'admin@makalearn.local')),
  ('gesture-no', 'gesture', 'No', 'cat-gestures', 'Fixed demo gesture for no.', 'Use the visibility indicator to keep feedback focused and calm.', null, null, null, array['gesture', 'fixed', 'demo'], null, (select id from public.profiles where email = 'admin@makalearn.local')),
  ('gesture-sit-down', 'gesture', 'Sit down', 'cat-gestures', 'Fixed demo gesture for asking to sit down.', 'Give one short cue, wait, then repeat if the learner needs another model.', null, null, null, array['gesture', 'fixed', 'demo'], null, (select id from public.profiles where email = 'admin@makalearn.local'))
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
  ('learner-ella', 'Ella M.', 7, 'Primary 2', 'Benefits from visual prompts and repeated modeling.', 'Visual', (select id from public.profiles where email = 'teacher@makalearn.local'), '/placeholder-learner-1', 'active'),
  ('learner-noah', 'Noah K.', 9, 'Primary 4', 'Responds well to short audio cues and gesture practice.', 'Mixed', (select id from public.profiles where email = 'teacher@makalearn.local'), '/placeholder-learner-2', 'active')
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
  ('lesson-needs', 'Snack Time Requests', 'Practice requesting food, drink, and more during a guided routine.', 'Model each item, ask the learner to choose, then run a short quiz.', 'choose-correct-symbol', 15, 'Use classroom objects where possible.', 'manual', 'shared', (select id from public.profiles where email = 'teacher@makalearn.local'))
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
  ('activity-match', 'Match Words to Placeholder Symbols', 'match-word-symbol', 'Pick the matching placeholder symbol for each word.', array['pecs-hello', 'item-eat', 'item-drink'], 'shared', (select id from public.profiles where email = 'teacher@makalearn.local')),
  ('activity-choice', 'Choose the Correct Symbol', 'choose-correct-symbol', 'Listen to the teacher prompt and choose the correct placeholder symbol.', array['pecs-hello', 'item-eat', 'item-drink'], 'shared', (select id from public.profiles where email = 'admin@makalearn.local'))
on conflict (id) do nothing;

insert into public.activity_items (id, activity_id, prompt, answer, options, learning_item_id, position)
values
  ('q-match-hello', 'activity-match', 'Hello', 'Hello', array['Hello', 'Eat', 'Drink'], 'pecs-hello', 0),
  ('q-match-eat', 'activity-match', 'Eat', 'EAT', array['HEL', 'EAT', 'DRK'], 'item-eat', 1),
  ('q-choice-drink', 'activity-choice', 'Choose Drink', 'DRK', array['HEL', 'EAT', 'DRK'], 'item-drink', 0)
on conflict (id) do nothing;

insert into public.audit_logs (
  id,
  category,
  action,
  actor_id,
  actor_name,
  target_type,
  target_id,
  target_title,
  detail,
  created_at
)
values
  ('log-seed-login', 'auth', 'login', (select id from public.profiles where email = 'admin@makalearn.local'), 'Amina Reyes', 'session', null, 'Admin sign in', 'Signed in to MakaLearn.', '2026-06-07T08:00:00.000Z'),
  ('log-seed-logout', 'auth', 'logout', (select id from public.profiles where email = 'teacher@makalearn.local'), 'Jordan Lee', 'session', null, 'Teacher sign out', 'Signed out of MakaLearn.', '2026-06-07T10:30:00.000Z'),
  ('log-seed-upload', 'content', 'upload', (select id from public.profiles where email = 'teacher@makalearn.local'), 'Jordan Lee', 'media', 'media-seed', 'Drink audio placeholder', 'Uploaded an audio file to the media library.', '2026-06-08T09:15:00.000Z'),
  ('log-seed-edit', 'content', 'edit', (select id from public.profiles where email = 'admin@makalearn.local'), 'Amina Reyes', 'activity', 'activity-choice', 'Choose the Correct Symbol', 'Updated activity details.', '2026-06-08T11:20:00.000Z'),
  ('log-seed-delete', 'content', 'delete', (select id from public.profiles where email = 'teacher@makalearn.local'), 'Jordan Lee', 'lesson', 'lesson-old', 'Old practice lesson', 'Deleted an outdated lesson draft.', '2026-06-09T13:00:00.000Z')
on conflict (id) do nothing;
