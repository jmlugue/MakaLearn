# MakaLearn

MakaLearn is an MVP for teacher-guided Makaton learning support. The current scope focuses on PECS content, a learner-facing PECS sentence Playground, PECS-based activities, a gesture recognition presentation tab, settings/help, and an admin panel for teacher account and content oversight.

Current learning content is placeholder-only. The app does not include official Makaton symbols, gestures, audio, videos, or a real gesture recognition model.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- lucide-react
- Supabase Auth, database, storage helpers, and server-side AI usage tracking

## Run locally

```bash
npm install
npm run dev
```

Useful checks:

```bash
npm run lint
npm run build
```

## Folder structure

```txt
src/
|- app/             # App Router pages
|- components/      # Layout, common UI, and local shadcn-style primitives
|- data/            # PECS manifest metadata used to organize Supabase learning rows
|- features/        # Page-level feature components and app workflows
|- lib/             # Shared utilities and Supabase helpers
|- types/           # Database-ready TypeScript models
`- utils/           # Lesson, activity, gesture feedback, and sentence validation utilities
```

## Main routes

- `/` landing page
- `/login` Supabase Auth sign-in
- `/content` PECS and gesture content library with in-app media previews
- `/gesture-practice` guided practice with webcam preview, live MediaPipe hand-landmark outlines, hand visibility checks, and placeholder teacher feedback
- `/activities` PECS and gesture-practice activity library, player, manual creator, adaptive question generation, and draft helper
- `/playground` PECS/AAC sentence builder with category filters, drag/drop or tap card selection, rule-based sentence checking, and speech/audio playback
- `/settings` profile, accessibility, and display settings
- `/help` teacher/admin guide
- `/admin` admin-only teacher account, content monitoring, uploads, logs, and development tools

Legacy route `/learners` redirects to `/content` because learner management is not active in the current navigation.

## Current product behavior

- PECS and gestures are separate content types.
- PECS cards support image and audio uploads only.
- The Playground loads PECS/AAC card images and audio from Supabase `learning_items` URLs. The manifest mapping in `public/pecs/pecs_arasaac_manifest.json` is used for category and sentence-role metadata.
- Learning material media under `public/pecs`, `public/audio/pecs`, `public/gesture-references`, and gesture audio is migration source material only. Runtime learning media should come from Supabase Storage.
- Playground is available in teacher UI and Student Mode. Other teacher-only pages remain restricted while Student Mode is active.
- Playground sentence checks use `validatePecsSentence`, a rule-based PECS arrangement validator with supported patterns such as `I want water`, `I am happy`, `Please sit`, greetings, responses, and safety expressions.
- Teachers can store additional gesture records in Content Library.
- Gesture Recognition uses MediaPipe hand landmarks and a rule-based sample predictor for seven fixed labels: I want to go to toilet, I want to eat food, I want to drink water, Help, Yes, No, and Sit down. These temporary finger-pose mappings are not official Makaton gestures and will be replaced by an approved trained model.
- See `GESTURE_SAMPLE_POSES.md` for the complete demo pose-to-prediction mapping.
- Gesture records support reference image, gesture image/video, and audio uploads.
- PECS and gesture images/videos/audio can be previewed inside the website.
- Activities can be created from PECS cards or gesture records. Gesture-practice activities use teacher-completed scoring options.
- Activity question generation adapts to each PECS card label and description, so greetings and choices do not use request-only wording.
- The Draft with AI button in Activity creation uses a Supabase-backed cache before calling Hugging Face. It only drafts PECS fill-in-the-blank or choose-correct-symbol prompts, and Generate new version consumes quota.
- Drag-and-drop answers remain visual cards after dropping, and scored incorrect answers use red feedback.
- Saving a PECS lesson creates a related playable activity and the lesson shows an Open activity action. Gesture lessons show a Practice gesture action.
- Activity scoring writes result summaries to Supabase and keeps the current player state in memory while an activity is open.
- The real icon-only logo is served from `public/makalearn_logo_current.png` and used in the primary brand surfaces.
- Admins can create teacher accounts, deactivate/reactivate teachers, change roles, monitor teacher-managed content, review uploads, and see logs through Supabase-backed flows.

## Auth and data

MakaLearn uses Supabase Auth for admin and teacher accounts. Teacher sign-in routes to `/content`; admin sign-in routes to `/admin`.

Development/demo records live in `supabase/seed.sql`. The app does not use `localStorage` or mock TypeScript data as real persistence for users, learners, content, uploads, activities, prompt cache, scoring, or usage limits.

Create `.env.local` from `.env.example`:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

For Hugging Face activity drafts, add `HUGGINGFACE_API_TOKEN` or `HF_TOKEN` with Inference Providers access. The default model is `openai/gpt-oss-120b:fastest`; set `HUGGINGFACE_ACTIVITY_MODEL` to try another Hugging Face chat-completion model.

AI activity drafting requires Supabase for authenticated cache and quota checks before model calls. If Supabase or Hugging Face is unavailable, the server returns editable rule-based starter prompts so the teacher can continue without spending model usage.

## Supabase setup

Current integration points:

- Auth and profile role lookup
- Table helpers for profiles, categories, learning items, media assets, lessons, and activities
- Storage upload helpers for picture-card images, gesture media, audio, and legacy learner photos
- AI prompt generation cache in `activity_prompt_generations`
- AI usage/rate-limit tracking in `ai_usage_events`

Apply the Supabase-only migration:

```bash
npx supabase db push
```

Create the demo Supabase Auth users before loading seed data:

- `admin@makalearn.local` with user metadata role `admin`
- `teacher@makalearn.local` with user metadata role `teacher`

The auth trigger creates matching `profiles` rows. Then load `supabase/seed.sql` through Supabase Studio/SQL editor, or let the local CLI load it during `npx supabase db reset`.

Inventory and upload existing learning material media to Supabase Storage:

```bash
npm run supabase:migrate-learning-media:dry-run
npm run supabase:migrate-learning-media
```

The media migration uploads PECS card PNGs, PECS audio, fixed gesture reference images, and fixed gesture audio to the correct buckets, upserts matching `media_assets` rows, and updates `learning_items.symbol_image_url`, `learning_items.gesture_media_url`, and `learning_items.audio_url` with Supabase Storage public URLs.

Planned updates before production:

- Review schema, RLS, and seed data against real teacher/admin rollout needs.
- Keep MediaPipe for live hand landmarks and replace the placeholder practice result/feedback logic with the approved recognition model when it is available.
- Review Hugging Face activity drafting for privacy, model quality, age appropriateness, quota limits, and API key handling before production use.
- Decide whether learner profile management returns in a later phase.

## Placeholder logic notes

- PECS and gesture media are placeholders and must not be treated as official Makaton content.
- `generateCorrectiveFeedbackPlaceholder` and `generateFeedbackPlaceholder` are marked for future model/AI replacement.
- Gesture hand tracking is a presentation simulation. It accepts one or two visible hands and one person in the UI but does not perform real recognition.
- The AI activity draft can use Hugging Face when configured, but only after Supabase cache and usage checks pass. Gesture-practice, match, drag/drop, and local scoring do not call the model.
- Playground validation is local rule-based logic, not NLP, grammar correction, or AI.
