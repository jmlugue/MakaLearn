# MakaLearn

MakaLearn is an MVP for teacher-guided Makaton learning support. The current scope focuses on PECS content, a learner-facing PECS sentence Playground, PECS-based activities, a gesture recognition presentation tab, settings/help, and an admin panel for teacher account and content oversight.

Current learning content is placeholder-only. The app includes a local trained seven-label gesture recognizer for the thesis prototype, but it does not include official Makaton symbols, official gesture videos, official audio, or clinically validated assessment logic.

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
npm run validate:materials
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
- `/request-account` public teacher account request form with admin review
- `/content` PECS and gesture content library with in-app media previews
- `/gesture-practice` guided practice with webcam preview, live MediaPipe hand-landmark outlines, trained local recognition, and Gemini-first corrective feedback with template fallback
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
- Gesture Recognition uses MediaPipe hand landmarks and the bundled trained MakaLearn gesture model for seven fixed labels: I want to go to toilet, I want to eat, I want to drink, Help, Yes, No, and Sit down. These prototype labels/media are not official Makaton content.
- Gesture Practice is free practice: the side card is a reference aid, while corrective feedback is based on the gesture actually recognized by the model.
- See `GESTURE_SAMPLE_POSES.md` for the complete demo pose-to-prediction mapping.
- Gesture records support reference image, gesture image/video, and audio uploads.
- PECS and gesture images/videos/audio can be previewed inside the website.
- Activities can be created from PECS cards or gesture records. Gesture-practice activities use teacher-completed scoring options.
- Activity question generation adapts to each PECS card label and description, so greetings and choices do not use request-only wording.
- The Inspire me with AI button in Activity creation uses a Supabase-backed cache before calling Gemini with its own activity-only API key. It only drafts PECS fill-in-the-blank or legacy choose-correct-symbol prompts. Gemini text must pass one-sentence, 5-to-12-word, answer-leak, suitability, and semantic-conflict checks before it is shown. If wording fails those checks, MakaLearn silently uses checked question-bank text where available instead of spending another model call. Teachers can lock individual Fill in the blank sentences so later inspiration keeps their wording.
- Drag-and-drop answers remain visual cards after dropping, and scored incorrect answers use red feedback.
- Saving a PECS lesson creates a related playable activity and the lesson shows an Open activity action. Gesture lessons show a Practice gesture action.
- Activity scoring writes result summaries to Supabase and keeps the current player state in memory while an activity is open.
- The real icon-only logo is served from `public/makalearn_logo_current.png` and used in the primary brand surfaces.
- Admins can approve or reject teacher account requests, create accounts directly, deactivate/reactivate teachers, change roles, monitor teacher-managed content, review uploads, and see logs through Supabase-backed flows.

## Auth and data

MakaLearn uses Supabase Auth for admin and teacher accounts. Teacher sign-in routes to `/content`; admin sign-in routes to `/admin`. Public signup remains disabled. A visitor may submit a row to `account_requests`, but no Auth user or active profile exists until an active admin approves the request and sets a temporary password. Rejection creates no login account.

Development/demo records live in `supabase/seed.sql`. The app does not use `localStorage` or mock TypeScript data as real persistence for users, learners, content, uploads, activities, prompt cache, scoring, or usage limits.

Create `.env.local` from `.env.example`:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
SUPABASE_SERVICE_ROLE_KEY=
GEMINI_API_KEY=
GEMINI_MODEL=gemini-3.5-flash-lite
GEMINI_ACTIVITY_API_KEY=
GEMINI_ACTIVITY_MODEL=gemini-3.5-flash-lite
```

For activity drafts, add a separate `GEMINI_ACTIVITY_API_KEY`. `GEMINI_ACTIVITY_MODEL` defaults to `gemini-3.5-flash-lite`. The activity route sends only the selected teaching material's ID, label, category, description, instruction, tags, sentence role, and conflicting card labels plus the classroom-question rules. These reference fields are explicitly treated as untrusted data. Gemini never receives camera frames, hand landmarks, gesture predictions, learner identity, or classroom notes.

For gesture corrective feedback, add `GEMINI_API_KEY`. `GEMINI_MODEL` defaults to `gemini-3.5-flash-lite`. The server sends only structured recognition data, not camera frames, images, learner identity, or classroom notes; local templates are used when Gemini is missing, slow, malformed, too long, or unsafe.

AI activity drafting requires Supabase for authenticated cache and quota checks before model calls. Each user may make 10 model calls per rolling hour and 40 per rolling day, with a 60-second cooldown after a successful draft for the same material set. An explicit repeat click on Inspire me with AI bypasses that short cooldown and regenerates every unlocked sentence, while the hourly and daily limits still apply. The current wording is supplied as untrusted reference data, and identical output is rejected; if checked fallback wording is needed, MakaLearn selects a different bank sentence. One automatic retry is reserved for a transient provider failure; it counts as a second call and runs only when hourly and daily capacity remains. Invalid wording does not trigger another model call. Cache hits do not consume quota; failed calls still consume hourly/daily quota but do not start the same-material cooldown. If Supabase or the activity Gemini key is unavailable, the server returns editable checked question-bank prompts where available.

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

Database migrations do not change the hosted Auth service configuration. For each hosted project, open Authentication settings and turn off **Allow new users to sign up**, while keeping the Email provider enabled so existing and administrator-provisioned accounts can still sign in. The local `supabase/config.toml` mirrors that invite-only setup with `[auth].enable_signup = false` and `[auth.email].enable_signup = true`.

MakaLearn accounts are provisioned by administrators. Public users request teacher access from `/request-account`; admins review those requests in Admin > Accounts. Create the demo Supabase Auth users through Supabase Studio or another trusted Auth-admin flow before loading seed data:

- `admin@makalearn.local`
- `teacher@makalearn.local`

The auth trigger creates matching profiles as invited teachers and ignores role metadata. Then load `supabase/seed.sql` through Supabase Studio/SQL editor, or let the local CLI load it during `npx supabase db reset`; the seed promotes the demo admin and activates both demo accounts. Normal application provisioning uses the guarded Admin account flow, which assigns the requested role and activates the new profile only after an active administrator is authenticated.

Inventory and upload existing learning material media to Supabase Storage:

```bash
npm run supabase:migrate-learning-media:dry-run
npm run supabase:migrate-learning-media
```

The media migration uploads PECS card PNGs, PECS audio, fixed gesture reference images, and fixed gesture audio to the correct buckets, upserts matching `media_assets` rows, and updates `learning_items.symbol_image_url`, `learning_items.gesture_media_url`, and `learning_items.audio_url` with Supabase Storage public URLs.

Run `npm run validate:materials` to perform a read-only check of manifest image files and every Supabase material reference used by activities, lessons, reusable prompts, practice attempts, and media records.

Planned updates before production:

- Review schema, RLS, and seed data against real teacher/admin rollout needs.
- Review the trained gesture model, Gemini corrective feedback wording, privacy controls, and teacher-supervision language before production use.
- Review Gemini activity drafting for privacy, model quality, age appropriateness, quota limits, and API key handling before production use.
- Decide whether learner profile management returns in a later phase.

## Placeholder logic notes

- PECS and gesture media are placeholders and must not be treated as official Makaton content.
- `generateCorrectiveFeedbackPlaceholder` and `generateFeedbackPlaceholder` are marked for future model/AI replacement.
- Gesture hand tracking is a presentation simulation. It accepts one or two visible hands and one person in the UI but does not perform real recognition.
- The AI activity draft can use its isolated Gemini key when configured, but only after Supabase cache and usage checks pass. Gesture-practice, match, drag/drop, and local scoring do not call the activity model.
- Playground validation is local rule-based logic, not NLP, grammar correction, or AI.
## MSAV preparation for new materials

The 50 built-in Playground cards keep their reviewed, source-controlled MSAV roles and semantic rules. They are never sent to Gemini. A newly created teacher PECS material is saved first, then MakaLearn makes one server-side classification request using `GEMINI_MSAV_API_KEY`. Only the material label, category, description, generated instruction, and tags are sent; uploaded media is not sent.

If preparation succeeds, the validated profile is stored on `learning_items` and the card becomes available in Playground. If the key or provider is unavailable, the material remains in Content with a **Try preparing again** button and stays out of the Playground picker. There are no scheduled or automatic retries. Configure the optional classifier with:

```env
GEMINI_MSAV_API_KEY=
GEMINI_MSAV_MODEL=gemini-3.5-flash-lite
```
