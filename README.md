# MakaLearn

MakaLearn is an MVP for teacher-guided Makaton learning support. It gives teachers and admins a semi-working classroom app structure with Supabase Auth, database-backed records, placeholder learning content, learner profiles, content library tools, gesture practice, scored activities, progress reporting, settings, help, and an admin panel.

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
- `/login` Supabase Auth sign-in
- `/dashboard` role-aware dashboard
- `/learners` learner profiles
- `/content` content library
- `/gesture-practice` webcam practice and simulated feedback
- `/activities` activity library and scored player
- `/progress` learner reports and charting
- `/settings` profile, accessibility, and display preferences
- `/help` teacher/admin guide
- `/admin` admin-only panel

## Auth and data

MakaLearn uses Supabase Auth for admin and teacher accounts. Learners do not have logins; teachers select learner profiles during classroom sessions.

The app expects a matching row in `profiles` for each Auth user. The included schema adds an Auth trigger that creates that profile automatically from user metadata.

Create two Supabase Auth users for the first setup:

- Admin: `admin@makalearn.local`, role metadata `admin`
- Teacher: `teacher@makalearn.local`, role metadata `teacher`

Teacher sign-in routes to `/content`. Admin sign-in routes to `/dashboard`. Practice and activity sessions without a selected learner intentionally do not save results.

## Supabase setup

The app now requires Supabase for sign-in. Placeholder records in `src/data/mock-data.ts` remain as fallback content for incomplete setup states, but protected app pages expect a real signed-in account.

Current integration points:

- `@supabase/supabase-js` browser client and database helpers in `src/lib/supabase/`
- Supabase Auth email/password sign-in
- Table reads for profiles, learners, categories, learning items, media assets, lessons, activities, practice attempts, and activity results
- Writes for learner add/edit/archive, categories, lessons, activities, activity results, gesture practice attempts, profile details, and admin role changes
- Storage uploads for picture cards, gesture media, audio, and learner photos
- SQL files in `supabase/` for schema, storage buckets, authenticated RLS policies, and seed data

Still planned:

- Gesture recognition and corrective feedback model integration

Create `.env.local` from `.env.example`:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

Then run these SQL files in the Supabase SQL editor:

```txt
supabase/schema.sql
supabase/storage.sql
supabase/seed.sql
```

Create the two Auth users before running `supabase/seed.sql` so the seed records can attach learners and progress to the teacher profile.

## Placeholder logic notes

- Gesture recognition is simulated through teacher controls.
- `generateFeedbackPlaceholder` contains the current rule-based feedback and is marked for future gesture recognition, corrective feedback, or AI feedback integration.
- Database-backed pages connect to Supabase after sign-in. Placeholder records are only used as fallback content when setup data is missing.
- Upload controls connect to Supabase Storage when `.env.local` is configured.
- PDF export currently uses the browser print flow as a local placeholder.
