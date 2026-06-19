# MakaLearn Agent Handoff

This file summarizes the current state of the MakaLearn MVP so future agent sessions can get up to speed quickly.

## Required maintenance

Future agents should update this file whenever they make meaningful project changes. Document new routes, behavior changes, important files, verification results, known issues, setup changes, and next steps before ending the session.

## What was built

MakaLearn was scaffolded as a local-first Next.js MVP using:

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local UI primitives
- lucide-react
- Recharts

The app is local-first and still uses demo placeholder content, but Supabase integration points are now partially wired. When Supabase env vars are configured, auth, data loading, inserts, uploads, and selected deletes can use Supabase. When Supabase is not configured, core UI flows continue locally.

## Current routes

- `/` - public landing page
- `/login` - Supabase email/password sign-in with polished error states
- `/dashboard` - role-aware dashboard
- `/learners` - learner profile management
- `/content` - content library
- `/gesture-practice` - webcam practice with simulated feedback
- `/activities` - activity library and scored player; supports `?type=` to open the first matching activity type
- `/progress` - learner progress reports and charts
- `/settings` - profile, accessibility, and display settings
- `/help` - teacher/admin guide
- `/admin` - admin-only panel

## Important behavior

- Teacher sign-in routes to `/content`.
- Admin sign-in routes to `/dashboard`.
- Learners do not have login accounts.
- Teachers select learner profiles during classroom workflows.
- Admin navigation appears only for admin users.
- Demo mode in Gesture Practice and Activities does not save results.
- Login validation now shows inline field errors, red error styling, and an error-tone toast for failed credentials.
- Content Library supports adding learning items through a working form with symbol, gesture, and audio uploads.
- Content Library item media controls show `Change` only for real media, support removing media, and work in local mode.
- Learning item deletes use an in-app confirmation dialog and persist in local mode via `localStorage`; Supabase deletes are wired when configured.
- Tags were removed from the visible Content Library add-item form and item cards.
- Lessons are displayed in a row-based layout: builder first, then a searchable `Lessons` library.
- Lessons can be deleted from the library with an in-app confirmation dialog.
- Lesson cards have an `Open activity` action that routes to `/activities?type=<activityType>`.
- Gesture Practice renders symbol images, gesture image/video references, and audio cues as media tiles instead of raw URLs.
- Gesture Practice always shows the audio cue tile, including an empty state with waveform styling.

## Key files and folders

- `src/types/index.ts` - database-ready TypeScript models.
- `src/data/mock-data.ts` - local placeholder data for users, learners, content, activities, results, attempts, and media.
- `src/components/layout/` - app shell, sidebar, mobile navigation, page header.
- `src/components/ui/` - local reusable UI primitives.
- `src/components/common/` - toasts, empty states, loading states, stat cards.
- `src/features/auth/use-auth-user.tsx` - current authenticated user/profile state.
- `src/features/auth/login-panel.tsx` - Supabase sign-in form and inline credential error handling.
- `src/features/content/content-library-view.tsx` - content library, add-item flow, media controls, lessons, local persistence, and delete dialogs.
- `src/features/activities/activities-view.tsx` - activity player and query-param activity type selection.
- `src/features/gesture/gesture-practice-view.tsx` - webcam practice, media reference tiles, simulated feedback, and save attempt flow.
- `src/lib/supabase/app-data.ts` - typed Supabase data loading and insert/delete/update helpers.
- `src/lib/supabase/media.ts` - Supabase Storage media upload helper.
- `src/utils/lesson-template.ts` - auto-generated lesson draft helper.
- `src/utils/gesture-feedback.ts` - `generateFeedbackPlaceholder` for rule-based feedback.
- `src/utils/progress.ts` - local progress calculation helpers.

## Future Supabase preparation

Supabase is still not required to run the app. Current Supabase-related behavior includes:

- Supabase Auth login and profile role lookup.
- Supabase database reads through `fetchMakaLearnData`.
- Supabase inserts for learners, categories, learning items, lessons, activities, practice attempts, and activity results.
- Supabase deletes for learning items and lessons.
- Supabase Storage uploads for:
  - `symbol-images`
  - `gesture-media`
  - `audio-files`
  - `learner-photos`

Still future or incomplete:

- Full production Auth onboarding and password/account management.
- Robust Row Level Security review for admin and teacher data access.
- Supabase Storage object deletion when media records are removed.
- Full PDF export implementation for progress reports.

`.env.example` exists with:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Placeholder content policy

The app does not include official Makaton symbols, gesture videos, audio, or copyrighted symbol sets.

Current learning labels and media are demo placeholders only. Official or approved content should be added later by the content owner or school.

## Verification already run

These commands passed:

```bash
npm run lint
npm run build
```

Recent sessions repeatedly verified the app with `npm run lint` and `npm run build`.

## Known notes

- `npm install` completed successfully.
- npm reported 5 audit findings in the dependency tree. `npm audit fix --force` was not run because it may introduce breaking upgrades.
- PowerShell blocked direct `npm.ps1` execution in one command path, so the dev server was started via `npm.cmd`.
- `.gitignore` now ignores generated/cache/local files such as `node_modules`, `.next`, `.vercel`, `.turbo`, coverage, local env files, logs, and OS artifacts.
- Lint/build currently pass with one known Next.js warning: `src/features/content/content-library-view.tsx` uses a plain `<img>` for content preview images.
- Local Content Library state persists through `localStorage` when Supabase is not configured.
- Local blob preview URLs are session-only. If a local uploaded image is stored as a blob URL and the browser session changes, it may not survive as a real file-backed asset.

## Suggested next work

- Review the UI in browser on desktop and mobile widths.
- Consider replacing the Content Library preview `<img>` with `next/image` or explicitly documenting why plain `<img>` is acceptable for blob/Supabase URLs.
- Add real edit flows for lessons and learning items if needed.
- Decide whether local-only content should remain in `localStorage` or move fully to Supabase now that CRUD behavior is expanding.
- Later, review Supabase schema, RLS policies, storage bucket setup, and Auth integration before production use.
