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
- `/content` PECS and gesture content library with in-app media previews
- `/gesture-practice` guided practice with webcam preview, live MediaPipe hand-landmark outlines, trained local recognition, and Gemini-first corrective feedback with template fallback
- `/activities` PECS activity library, player, manual creator, adaptive question generation, and draft helper
- `/playground` PECS/AAC sentence builder with category filters, drag/drop or tap card selection, rule-based sentence checking, and speech/audio playback
- `/settings` profile, accessibility, and display settings
- `/help` teacher/admin guide
- `/admin` admin-only teacher account, content monitoring, uploads, logs, and development tools

Legacy route `/learners` redirects to `/content` because learner management is not active in the current navigation.

## Current product behavior

- PECS and gestures are separate content types.
- PECS materials support a standard card picture, a separate word-free Activity picture, and optional audio. The standard picture may contain the printed label; the Activity picture must not.
- The Playground loads the standard PECS/AAC card image from Supabase, groups cards by their saved Supabase category, and reads every card with the one browser voice selected in Settings. Uploaded audio remains available in Content but is not required for Playground.
- Learning material media under `public/pecs`, `public/audio/pecs`, `public/gesture-references`, and gesture audio is migration source material only. Runtime learning media should come from Supabase Storage.
- Playground is available in teacher UI and Student Mode. Other teacher-only pages remain restricted while Student Mode is active.
- Playground uses AI English grammar checking first, with permanent Supabase decisions and fixed local feedback. AI receives only ordered text and ignores card roles. `validatePecsSentence` uses roles only as the outage fallback or in explicit algorithm mode; it also accepts simple person descriptions such as `I am a friend`. Configure the dedicated key as described in [Playground checking](docs/playground-checker.md).
- Teachers can store additional gesture records in Content Library.
- Gesture Recognition uses MediaPipe hand landmarks and the bundled trained MakaLearn gesture model for seven fixed labels: I want to go to toilet, I want to eat, I want to drink, Help, Yes, No, and Sit down. These prototype labels/media are not official Makaton content.
- Gesture Practice is free practice: the side card is a reference aid, while corrective feedback is based on the gesture actually recognized by the model.
- See `GESTURE_SAMPLE_POSES.md` for the complete demo pose-to-prediction mapping.
- Gesture records support reference image, gesture image/video, and audio uploads.
- PECS and gesture images/videos/audio can be previewed inside the website.
- Active Activities use PECS materials only. Built-in cards use `public/pecs/generated_cards_no_text`; teacher-created cards must have `learning_items.activity_image_url` before they can appear as answers or distractors. The standard labelled card image is never used as an Activity answer fallback.
- Activity question generation adapts to each PECS card label and description, so greetings and choices do not use request-only wording.
- The Inspire me with AI button in Activity creation uses a Supabase-backed cache before calling Gemini with its own activity-only API key. It only drafts PECS fill-in-the-blank or legacy choose-correct-symbol prompts. Gemini text must pass one-sentence, 5-to-12-word, answer-leak, suitability, and semantic-conflict checks before it is shown. If wording fails those checks, MakaLearn silently uses checked question-bank text where available instead of spending another model call. Teachers can lock individual Fill in the blank sentences so later inspiration keeps their wording.
- Drag-and-drop answers remain visual cards after dropping, and scored incorrect answers use red feedback.
- Collections group teaching materials. Activities can be created from a collection in the Activity creator; saving a collection does not automatically create an activity. Current data adapters use the `collections` and `collection_items` APIs. Legacy `lessons` backing tables remain compatible with older deployed clients; saved IDs are unchanged.
- Teacher-player scoring stays in memory. Completed Student Mode rounds played by teachers are saved in `activity_results` for Admin's Activity usage chart, including score/counts and duration. Gesture attempts are never saved.
- The real icon-only logo is served from `public/makalearn_logo_current.png` and used in the primary brand surfaces.
- Admins can create accounts directly, deactivate/reactivate teachers, change roles, monitor teacher-managed content, review uploads, and see logs through Supabase-backed flows.

## Auth and data

MakaLearn uses Supabase Auth for admin and teacher accounts. Teacher sign-in routes to `/content`; admin sign-in routes to `/admin`. Public signup remains disabled. Admins create accounts directly in Admin > Accounts and share temporary passwords privately.

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
- Table helpers for profiles, categories, learning items, media assets, collections, and activities
- Storage upload helpers for picture-card images, gesture media, and audio
- AI prompt generation cache in `activity_prompt_generations`
- AI usage/rate-limit tracking in `ai_usage_events`

For the existing linked project, inspect pending migrations before applying them:

```bash
npx supabase db push --dry-run
```

Apply only reviewed pending migrations with `npx supabase db push`. The current migration history assumes an existing core schema; it is not yet a verified empty-project bootstrap. Do not run `schema.sql` or a database reset against the hosted project. See [the Supabase readiness review](docs/supabase-readiness-audit.md) for the applied cleanup, compatibility names, and remaining setup gaps. `supabase/readiness-audit.sql` provides a repeatable read-only inventory. The retired learner and gesture-attempt tables were removed; empty compatibility views keep older deployed page loads working. Recovery snapshots are excluded from Git under `supabase/backups/`.

Database migrations do not change the hosted Auth service configuration. For each hosted project, open Authentication settings and turn off **Allow new users to sign up**, while keeping the Email provider enabled so existing and administrator-provisioned accounts can still sign in. The local `supabase/config.toml` mirrors that invite-only setup with `[auth].enable_signup = false` and `[auth.email].enable_signup = true`.

MakaLearn accounts are provisioned by administrators. Admins create accounts directly in Admin > Accounts. Create the demo Supabase Auth users through Supabase Studio or another trusted Auth-admin flow before loading seed data:

- `admin@makalearn.local`
- `teacher@makalearn.local`

The auth trigger creates matching profiles as invited teachers and ignores role metadata. Then load `supabase/seed.sql` through Supabase Studio/SQL editor, or let the local CLI load it during `npx supabase db reset`; the seed promotes the demo admin and activates both demo accounts. Normal application provisioning uses the guarded Admin account flow, which assigns the requested role and activates the new profile only after an active administrator is authenticated.

Inventory and upload existing learning material media to Supabase Storage:

```bash
npm run supabase:migrate-learning-media:dry-run
npm run supabase:migrate-learning-media
```

The media migration uploads PECS card PNGs, PECS audio, fixed gesture reference images, and fixed gesture audio to the correct buckets, upserts matching `media_assets` rows, and updates `learning_items.symbol_image_url`, `learning_items.gesture_media_url`, and `learning_items.audio_url` with Supabase Storage public URLs.

Run `npm run validate:materials` to perform a read-only check of manifest image files and every Supabase material reference used by activities, collections, reusable prompts, and media records. `npm run test:readiness:db` checks hosted API reads and anonymous denial; its optional teacher/admin HTTP tests require the existing `TEST_TEACHER_*`, `TEST_TEACHER2_*`, and `TEST_ADMIN_*` variables. `supabase/verify-readiness.sql` tests database roles inside a transaction that rolls back all test writes.

Planned updates before production:

- Review schema, RLS, and seed data against real teacher/admin rollout needs.
- Review the trained gesture model, Gemini corrective feedback wording, privacy controls, and teacher-supervision language before production use.
- Review Gemini activity drafting for privacy, model quality, age appropriateness, quota limits, and API key handling before production use.
- Decide whether learner profile management returns in a later phase.

## Placeholder logic notes

- When adding a PECS material, **Add label to picture** is on by default. Upload word-free artwork and enter its Label to preview a captioned Content card and a word-free Activity card. Both PNGs use the same picture placement; captions shrink or wrap to two lines, with an error if they cannot fit legibly. **Use card outline** fits the whole picture above the caption on the white 900 × 1200 template. **Use image as uploaded** preserves an existing card's layout and proportions, adds no frame, and requires confirmation that the bottom caption area is blank before adding text. Use plain artwork if the caption overlaps content. If the upload already contains words, turn off **Add label to picture** and upload a separate word-free Activity picture. Existing saved materials and their replacement controls are unchanged. Preview generation blocks Save until the current settings are ready; filenames, upload limits, audio, and gesture references keep their existing rules.

- PECS and gesture media are placeholders and must not be treated as official Makaton content.
- `generateCorrectiveFeedbackPlaceholder` and `generateFeedbackPlaceholder` are marked for future model/AI replacement.
- Gesture hand tracking uses real MediaPipe landmarks and the bundled trained recognizer. Corrective feedback uses Gemini with local template fallback; gesture attempts are session-only.
- The AI activity draft can use its isolated Gemini key when configured, but only after Supabase cache and usage checks pass. Gesture-practice, match, drag/drop, and local scoring do not call the activity model.
- Playground's original local validator remains available; the optional primary checker below judges standard English without changing that algorithm.
## MSAV preparation for new materials

For the optional strict-English Playground checker, saved decisions, six grammar
cards, pronunciation correction, setup, and rollback switch, see
[Playground checker](docs/playground-checker.md). Material preparation below
remains a separate feature.

The 50 built-in Playground cards keep their reviewed, source-controlled MSAV roles and semantic rules. They are never sent to Gemini. A newly created teacher PECS material is saved first, then MakaLearn makes one server-side classification request using `GEMINI_MSAV_API_KEY`. Only the material label, category, description, generated instruction, and tags are sent; uploaded media is not sent.

Standalone feedback distinguishes words, phrases, and sentences. One-word labels, including Listen, Help, Hello, and Yes, receive **You made a word.** The bundled Good morning, Thank you, and Wash hands cards receive **You made a phrase.** Am, Is, and Are still need other cards. This learning feedback describes the visible label, so a single command word is praised as a word even when it can function as an imperative sentence.

New Gemini preparations also require `singleCardType` (`word`, `phrase`, or `sentence`) in the existing JSON profile. Multi-word labels default to phrases; a prepared complete statement or question, such as I am happy, can receive **You made a sentence.** The server rejects missing, unknown, or word-count-inconsistent classifications. Older profiles remain compatible and use word/phrase fallback without a new model call. Gemini supplies metadata once; every Check and its feedback still run locally with fixed wording. No database migration is required.

If preparation succeeds, the validated profile is stored on `learning_items`. The card becomes available in Playground once it also has a public standard card picture; audio is optional. If the key or provider is unavailable, the material remains in Content with a **Try preparing again** button and stays out of the Playground picker. There are no scheduled or automatic retries. Configure the optional classifier with:

```env
GEMINI_MSAV_API_KEY=
GEMINI_MSAV_MODEL=gemini-3.5-flash-lite
```
