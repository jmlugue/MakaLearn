# MakaLearn

MakaLearn is a local-first MVP for teacher-guided Makaton learning support. It gives teachers and admins a semi-working classroom app structure with placeholder data, demo login roles, learner profiles, content library tools, gesture practice, scored activities, progress reporting, settings, help, and an admin panel.

Current learning content is placeholder-only. The app does not include official Makaton symbols, gestures, audio, or videos.

## Tech stack

- Next.js App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style local components
- lucide-react
- Recharts

## Run locally

```bash
npm install
npm run dev
```

Then open the local URL printed by Next.js.

Useful checks:

```bash
npm run lint
npm run build
```

## Folder structure

```txt
src/
├─ app/             # App Router pages
├─ components/      # Layout, common UI, and local shadcn-style primitives
├─ data/            # Local placeholder records
├─ features/        # Page-level feature components and local flows
├─ lib/             # Shared utilities
├─ types/           # Database-ready TypeScript models
└─ utils/           # Lesson, gesture feedback, and progress helpers
```

## Main routes

- `/` landing page
- `/login` local demo login
- `/dashboard` role-aware dashboard
- `/learners` learner profiles
- `/content` content library
- `/gesture-practice` webcam practice and simulated feedback
- `/activities` activity library and scored player
- `/progress` learner reports and charting
- `/settings` profile, accessibility, and display preferences
- `/help` teacher/admin guide
- `/admin` admin-only panel

## Local/demo data

The MVP uses `src/data/mock-data.ts` for demo users, learners, categories, learning items, lessons, activities, practice attempts, activity results, and uploaded media records. Demo login stores the selected local user in browser local storage.

Teacher demo login routes to `/content`. Admin demo login routes to `/dashboard`. Learners do not have logins; teachers select learner profiles during classroom sessions. Demo mode in gesture practice and activities intentionally does not save results.

## Future Supabase plan

The app is prepared for a later Supabase phase, but Supabase is not required to run the UI now.

Planned integration points:

- Supabase Auth for email/password sign-in
- `profiles` table for admin/teacher roles
- Database tables for learners, categories, learning items, media assets, lessons, activities, practice attempts, and activity results
- Supabase Storage buckets for `symbol-images`, `gesture-media`, `audio-files`, and `learner-photos`
- Row Level Security so admins can access all relevant records and teachers can access assigned learners plus shared center content

Create `.env.local` from `.env.example` when Supabase is connected later:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

## Placeholder logic notes

- Gesture recognition is simulated through teacher controls.
- `generateFeedbackPlaceholder` contains the current rule-based feedback and is marked for future gesture recognition, corrective feedback, or AI feedback integration.
- Upload controls are UI-only and are marked with future Supabase Storage bucket comments.
- PDF export currently uses the browser print flow as a local placeholder.
