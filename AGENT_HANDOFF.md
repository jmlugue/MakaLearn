# MakaLearn Agent Handoff

This file summarizes the current state of the MakaLearn MVP so future agent sessions can get up to speed quickly.

## Required maintenance

Future agents should update this file whenever they make meaningful project changes. Document new routes, behavior changes, important files, verification results, known issues, setup changes, and next steps before ending the session.

## Current scope

The app now prioritizes:

- PECS content management
- Gesture reference management, with fixed gestures separated from stored custom gestures
- PECS-only activity creation and scoring
- A gesture practice tab with live MediaPipe hand-landmark tracking and placeholder practice feedback
- Admin teacher account/content monitoring

The following product areas were removed from active navigation and current flows:

- Learners tab
- Learner selection in activities/gesture practice

Legacy route `/learners` redirects to `/content`.

## Current routes

- `/` - public landing page
- `/login` - Supabase email/password sign-in
- `/content` - PECS and gesture content library with in-app media previews
- `/gesture-practice` - gesture recognition presentation tab
- `/activities` - PECS-only activity library, player, creator, adaptive question generation, and AI draft helper
- `/settings` - profile, accessibility, and display settings
- `/help` - teacher/admin guide
- `/admin` - admin-only teacher account and content monitoring panel

## Important behavior

- Teacher sign-in routes to `/content`.
- Admin sign-in routes to `/admin`.
- Sidebar and mobile navigation show Content, Gestures, Activities, Settings, Help, and Admin only for admins.
- Content Library has a PECS/Gestures switch.
- PECS cards support image and audio uploads only.
- Content Library can store custom gestures.
- Gesture Recognition only shows the seven fixed gesture records:
  - I want to go to toilet
  - I want to eat food
  - I want to drink water
  - Help
  - Yes
  - No
  - Sit down
- Gesture cards support reference image, gesture image/video, and audio.
- Content Library and Media Library preview media inside the app instead of linking out.
- Activities use PECS cards only. The gesture-practice activity type is not offered in the UI.
- Activity generation adapts prompts to PECS labels/descriptions. Fill-in-the-blank no longer always uses `I want to ____`.
- Drag-and-drop dropped answers stay rendered as card images/placeholders, not URL text.
- Scored wrong answers use red feedback styling.
- Activity scoring is local/session-only.
- Activity creation includes a `Draft with AI` button that generates editable local draft fields from selected PECS cards.
- Gesture practice starts the webcam, draws a live landmark outline over up to two moving hands, checks visibility, and shows placeholder teacher feedback. The MediaPipe runtime, WASM files, and hand-landmarker model are stored locally in the project.
- Lesson cards no longer include an Open Activity action, avoiding confusion after activities are deleted.
- Admin Panel lets admins create local teacher account previews, change roles, activate/deactivate teachers locally, monitor teacher-managed content, review uploads, and inspect generated logs.
- The real logo is copied to `public/makalearn_logo.png` and used through `src/components/layout/brand-logo.tsx`.
- Landing and login pages now use glassmorphism, floating cue elements, hover motion, and scroll reveal CSS.

## Key files and folders

- `src/types/index.ts` - database-ready TypeScript models. `LearningItem` now has `contentType: "pecs" | "gesture"` and users can be `deactivated`.
- `src/data/mock-data.ts` - revised placeholder users, PECS cards, fixed gestures, PECS activities, media records, and an empty learner array.
- `src/components/layout/nav-items.ts` - active navigation after removing learner profile and reporting links from the MVP.
- `src/features/auth/login-panel.tsx` - sign-in redirects: admin to `/admin`, teacher to `/content`.
- `src/components/layout/brand-logo.tsx` - shared logo rendering from `public/makalearn_logo.png`.
- `src/features/content/content-library-view.tsx` - PECS/gesture separation, upload rules, stored custom gestures, media previews, PECS lesson drafts.
- `src/features/activities/activities-view.tsx` - PECS-only activity creation/player, AI draft helper, adaptive question rendering, local scoring.
- `src/features/gesture/gesture-practice-view.tsx` - webcam preview, live MediaPipe landmark overlay, visibility status, and placeholder teacher feedback.
- `src/features/admin/admin-panel-view.tsx` - revised admin account/content/log monitoring.
- `src/utils/gesture-feedback.ts` - placeholder feedback functions for future recognition/AI replacement.
- `src/lib/supabase/app-data.ts` - Supabase data helpers. `contentType` is currently inferred from tags until the database gets a real field.

## Supabase notes

Supabase helpers remain present, but the current UI scope is still local/demo friendly.

Before production or a full Supabase reconnection, review:

- Add a `content_type` column to `learning_items`.
- Update seed data for PECS/fixed gestures.
- Wire teacher create/deactivate to Supabase Auth and `profiles`.
- Learner reporting tables are removed from the current schema.
- Review RLS policies for admin-only teacher management and teacher-managed content.
- Keep storage buckets for PECS images, gesture media, and audio files.

## Placeholder content policy

The app does not include official Makaton symbols, gesture videos, audio, or copyrighted symbol sets.

Current labels and media are demo placeholders only. Official or approved content should be added later by the content owner or school.

## Verification

These commands passed after the latest scope change:

```bash
npm run lint
npm run build
```

Both commands still show the existing Next.js warning that `src/features/content/content-library-view.tsx` uses a plain `<img>` for content preview images.

## Known notes

- `.env.example` supports both `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and the older `NEXT_PUBLIC_SUPABASE_ANON_KEY` fallback.
- Local Content Library and Activities state can persist in `localStorage`. Old local records are normalized enough to avoid crashes, but clearing localStorage may be useful when reviewing the new seeded PECS/gesture split.
- The fake hand tracking demo is timer-driven for presentation purposes. It is not real hand/person detection.
- AI activity generation is local adaptive logic, not a connected LLM.
- `makalearn_logo.png` remains at the repo root and is also copied into `public/` for serving.

## Suggested next work

- Review the UI in browser on desktop and mobile widths.
- Decide whether to delete or restore the unused legacy learner feature files in a later phase.
- Update Supabase schema and seed files to match the new PECS/gesture/admin scope.
- Replace the Content Library preview `<img>` warning if image optimization becomes important.
