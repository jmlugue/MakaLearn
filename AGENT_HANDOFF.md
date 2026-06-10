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

The app uses placeholder/local data only. Supabase is not connected yet.

## Current routes

- `/` - public landing page
- `/login` - local demo login
- `/dashboard` - role-aware dashboard
- `/learners` - learner profile management
- `/content` - content library
- `/gesture-practice` - webcam practice with simulated feedback
- `/activities` - activity library and scored player
- `/progress` - learner progress reports and charts
- `/settings` - profile, accessibility, and display settings
- `/help` - teacher/admin guide
- `/admin` - admin-only panel

## Important behavior

- Teacher demo login routes to `/content`.
- Admin demo login routes to `/dashboard`.
- Learners do not have login accounts.
- Teachers select learner profiles during classroom workflows.
- Admin navigation appears only for admin demo users.
- Demo mode in Gesture Practice and Activities does not save results.

## Key files and folders

- `src/types/index.ts` - database-ready TypeScript models.
- `src/data/mock-data.ts` - local placeholder data for users, learners, content, activities, results, attempts, and media.
- `src/components/layout/` - app shell, sidebar, mobile navigation, page header.
- `src/components/ui/` - local reusable UI primitives.
- `src/components/common/` - toasts, empty states, loading states, stat cards.
- `src/features/auth/use-demo-user.ts` - local demo role state using browser local storage.
- `src/utils/lesson-template.ts` - auto-generated lesson draft helper.
- `src/utils/gesture-feedback.ts` - `generateFeedbackPlaceholder` for rule-based feedback.
- `src/utils/progress.ts` - local progress calculation helpers.

## Future Supabase preparation

Supabase is intentionally not required yet. The code includes comments for later integration points:

- Supabase Auth login and profile role lookup.
- Supabase database queries for mock data replacement.
- Supabase Storage uploads for:
  - `symbol-images`
  - `gesture-media`
  - `audio-files`
  - `learner-photos`
- Row Level Security for admin and teacher data access.
- Practice attempt and activity result inserts.

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

The dev server was started and verified at:

```txt
http://localhost:3000
```

## Known notes

- `npm install` completed successfully.
- npm reported 5 audit findings in the dependency tree. `npm audit fix --force` was not run because it may introduce breaking upgrades.
- PowerShell blocked direct `npm.ps1` execution in one command path, so the dev server was started via `npm.cmd`.
- `.gitignore` now ignores generated/cache/local files such as `node_modules`, `.next`, `.vercel`, `.turbo`, coverage, local env files, logs, and OS artifacts.

## Suggested next work

- Review the UI in browser on desktop and mobile widths.
- Add finer visual polish and any missing classroom copy.
- Decide whether to commit the current MVP scaffold.
- Later, add Supabase schema, RLS policies, storage bucket setup, and Auth integration when requested.
