---
name: future-supabase
description: Use this skill when preparing MakaLearn for Supabase Auth, database tables, storage buckets, Row Level Security, environment variables, or later backend integration.
---

# Future Supabase Skill

Use this skill when preparing backend integration for MakaLearn.

## Current phase

The first build should work without Supabase configured.

Prepare the codebase for Supabase, but do not make Supabase required until the user asks to connect it.

## Planned Supabase features

Supabase will later handle:
- Authentication
- Profiles and roles
- Learner records
- Learning items
- Categories
- Lessons
- Activities
- Practice attempts
- Activity results
- Storage uploads
- Row Level Security

## Auth

Use email/password auth later.

Roles should be stored in a `profiles` table.

Roles:
- admin
- teacher

Learners do not authenticate.

Login page should include:
- Email
- Password
- Forgot password link
- Demo login buttons

Demo login buttons can use local demo users first.

## Planned tables

Prepare types/schema thinking for:

- profiles
- learners
- categories
- learning_items
- media_assets
- lessons
- lesson_items
- activities
- activity_items
- practice_attempts
- activity_results

Teacher notes are not part of the MVP.

## Visibility rules

Planned behavior:
- Admin can access all relevant records.
- Teacher can access assigned learners.
- Teacher can access learning items, lessons, and categories shared across the center.
- Practice attempts are visible to assigned teacher and admin.
- Activity results are visible to assigned teacher and admin.
- Demo mode does not save results.

## Storage buckets

Prepare for these buckets:

- symbol-images
- gesture-media
- audio-files
- learner-photos

Upload restrictions:
- Symbol/profile photos: image files only
- Audio: audio files only
- Gesture media: image or video files only

## Environment variables

Prepare `.env.example` with:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Do not commit real keys.

## Code comments

At future integration points, add comments like:

```ts
// Future Supabase: replace mock data with a query to the learning_items table.
```

```ts
// Future Supabase Storage: upload this file to the symbol-images bucket.
```

```ts
// Future RLS: teacher should only access assigned learners.
```

## SQL files

When asked to connect Supabase, create:
- SQL schema
- RLS policies
- seed data
- storage bucket notes

Keep this separated from the UI build unless requested.
