# MakaLearn

MakaLearn is an MVP for teacher-guided Makaton learning support. The current scope focuses on PECS content, PECS-based activities, a gesture recognition presentation tab, settings/help, and an admin panel for teacher account and content oversight.

Current learning content is placeholder-only. The app does not include official Makaton symbols, gestures, audio, videos, or a real gesture recognition model.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- lucide-react
- Recharts remains installed for future reporting needs
- Supabase client helpers are present for future/back-end integration

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
|- data/            # Local placeholder records
|- features/        # Page-level feature components and local flows
|- lib/             # Shared utilities and Supabase helpers
|- types/           # Database-ready TypeScript models
`- utils/           # Lesson, activity, gesture feedback, and legacy helper utilities
```

## Main routes

- `/` landing page
- `/login` Supabase Auth sign-in
- `/content` PECS and gesture content library with in-app media previews
- `/gesture-practice` guided practice with webcam preview, live MediaPipe hand-landmark outlines, hand visibility checks, and placeholder teacher feedback
- `/activities` PECS-only activity library, player, manual creator, adaptive question generation, and AI draft helper
- `/settings` profile, accessibility, and display settings
- `/help` teacher/admin guide
- `/admin` admin-only teacher account, content monitoring, uploads, logs, and development tools

Legacy routes `/dashboard`, `/learners`, and `/progress` redirect to `/content` because dashboards, learner management, and progress tracking are removed from the current scope.

## Current product behavior

- PECS and gestures are separate content types.
- PECS cards support image and audio uploads only.
- Teachers can store additional gesture records in Content Library.
- Gesture Recognition only shows these seven fixed labels: I want to go to toilet, I want to eat food, I want to drink water, Help, Yes, No, and Sit down.
- Gesture records support reference image, gesture image/video, and audio uploads.
- PECS and gesture images/videos/audio can be previewed inside the website.
- Activities can only be created from PECS cards.
- Activity question generation adapts to each PECS card label and description, so greetings and choices do not use request-only wording.
- Gesture activity creation is removed; gestures are handled only in the gesture recognition tab.
- The AI draft button in Activity creation creates an editable local draft from selected PECS cards. Teachers review and edit before saving.
- Drag-and-drop answers remain visual cards after dropping, and scored incorrect answers use red feedback.
- Lessons no longer show an Open Activity action, so deleted activities are not implied by lesson records.
- Activity scoring is session-only in this scope and does not record learner progress.
- The real `makalearn_logo.png` is served from `public/makalearn_logo.png` and used in the primary brand surfaces.
- Admins can create local teacher account previews, deactivate/reactivate teachers, change roles, monitor teacher-managed content, review uploads, and see logs.

## Auth and data

MakaLearn uses Supabase Auth for admin and teacher accounts when configured. Teacher sign-in routes to `/content`; admin sign-in routes to `/admin`.

Local placeholder records live in `src/data/mock-data.ts`. Supabase helpers remain in `src/lib/supabase/`, but the current UI still works with local fallback data when Supabase is not configured.

Create `.env.local` from `.env.example`:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

## Future Supabase plan

Current integration points:

- Auth and profile role lookup
- Table helpers for profiles, categories, learning items, media assets, lessons, activities, practice attempts, and activity results
- Storage upload helpers for picture-card images, gesture media, audio, and legacy learner photos

Planned updates before production:

- Add a `content_type` field to learning items so PECS and gestures are separated in Supabase, not inferred from tags.
- Wire real admin teacher creation/deactivation through Supabase Auth and profiles.
- Review schema, RLS, and seed data against the new PECS/gesture scope.
- Keep MediaPipe for live hand landmarks and replace the placeholder practice result/feedback logic with the approved recognition model when it is available.
- Replace local adaptive activity generation with a connected LLM only after model, privacy, and API key handling are approved.
- Decide whether learner profiles and progress tracking return in a later phase.

## Placeholder logic notes

- PECS and gesture media are placeholders and must not be treated as official Makaton content.
- `generateCorrectiveFeedbackPlaceholder` and `generateFeedbackPlaceholder` are marked for future model/AI replacement.
- Gesture hand tracking is a presentation simulation. It accepts one or two visible hands and one person in the UI but does not perform real recognition.
- The AI activity draft is local adaptive logic, not a connected LLM.
