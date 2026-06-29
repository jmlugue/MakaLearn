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
  ('cat-choices', 'Choices', 'Placeholder words for quick answers.', '#fef3c7', coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('cat-gestures', 'Fixed gestures', 'The seven placeholder gesture cards used by gesture recognition.', '#dcfce7', coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin'))
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
  ('item-drink', 'Drink', 'cat-needs', 'A request for water or another drink.', 'Use a real cup or photo card as a prompt.', 'DRK', 'Gesture placeholder', 'drink-placeholder.mp3', array['needs', 'drink', 'placeholder'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('gesture-toilet', 'I want to go to toilet', 'cat-gestures', 'Fixed demo gesture for requesting the toilet.', 'Show the reference, start the camera, and check that both hands remain visible.', 'TOI', 'toilet-gesture-demo.mp4', '/audio/gesture-toilet.wav', array['gesture', 'fixed', 'demo'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('gesture-eat-food', 'I want to eat food', 'cat-gestures', 'Fixed demo gesture for requesting food.', 'Keep the learner centered and check that the live hand outline follows the movement.', 'EAT', 'eat-food-gesture-demo.mp4', '/audio/gesture-eat-food.wav', array['gesture', 'fixed', 'demo'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('gesture-drink-water', 'I want to drink water', 'cat-gestures', 'Fixed demo gesture for requesting water.', 'Use the hand visibility indicator before giving corrective feedback.', 'DRK', 'drink-water-gesture-demo.mp4', '/audio/gesture-drink-water.wav', array['gesture', 'fixed', 'demo'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('gesture-help', 'Help', 'cat-gestures', 'Fixed demo gesture for requesting help.', 'Ask the learner to repeat slowly if the hand detector loses visibility.', 'HLP', 'help-gesture-demo.mp4', '/audio/gesture-help.wav', array['gesture', 'fixed', 'demo'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('gesture-yes', 'Yes', 'cat-gestures', 'Fixed demo gesture for yes.', 'Start only when the camera shows one person in frame.', 'YES', 'yes-gesture-demo.mp4', '/audio/gesture-yes.wav', array['gesture', 'fixed', 'demo'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('gesture-no', 'No', 'cat-gestures', 'Fixed demo gesture for no.', 'Use the visibility indicator to keep feedback focused and calm.', 'NO', 'no-gesture-demo.mp4', '/audio/gesture-no.wav', array['gesture', 'fixed', 'demo'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin')),
  ('gesture-sit-down', 'Sit down', 'cat-gestures', 'Fixed demo gesture for asking to sit down.', 'Give one short cue, wait, then repeat if the learner needs another model.', 'SIT', 'sit-down-gesture-demo.mp4', '/audio/gesture-sit-down.wav', array['gesture', 'fixed', 'demo'], coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin'))
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
  ('log-seed-login', 'auth', 'login', coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin'), 'Amina Reyes', 'session', null, 'Admin sign in', 'Signed in to MakaLearn.', '2026-06-07T08:00:00.000Z'),
  ('log-seed-logout', 'auth', 'logout', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'), 'Jordan Lee', 'session', null, 'Teacher sign out', 'Signed out of MakaLearn.', '2026-06-07T10:30:00.000Z'),
  ('log-seed-upload', 'content', 'upload', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'), 'Jordan Lee', 'media', 'media-seed', 'Drink audio placeholder', 'Uploaded an audio file to the media library.', '2026-06-08T09:15:00.000Z'),
  ('log-seed-edit', 'content', 'edit', coalesce((select id from public.profiles where email = 'admin@makalearn.local'), 'seed-admin'), 'Amina Reyes', 'activity', 'activity-choice', 'Choose the Correct Symbol', 'Updated activity details.', '2026-06-08T11:20:00.000Z'),
  ('log-seed-delete', 'content', 'delete', coalesce((select id from public.profiles where email = 'teacher@makalearn.local'), 'seed-teacher'), 'Jordan Lee', 'lesson', 'lesson-old', 'Old practice lesson', 'Deleted an outdated lesson draft.', '2026-06-09T13:00:00.000Z')
on conflict (id) do nothing;
