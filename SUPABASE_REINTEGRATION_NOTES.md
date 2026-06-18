# MakaLearn Supabase Reintegration Notes

These notes capture the Supabase work done in this session so the integration can be rebuilt later after reverting the project to a non-Supabase state.

## Integration Goal

Connect MakaLearn to Supabase for:

- Auth with real admin and teacher accounts
- Profiles and roles
- Learners
- Categories
- Learning items
- Lessons and lesson items
- Activities and activity items
- Gesture practice attempts
- Activity results
- Media asset records
- Storage uploads for picture cards, gesture media, audio, and learner photos

Gesture recognition and corrective feedback models were intentionally not connected. They remained placeholder/simulated logic.

## Packages Added

```bash
npm.cmd install @supabase/supabase-js
npm.cmd install @supabase/ssr
```

The second package was added after Supabase generated a Next.js SSR prompt.

## Environment Variables

Use `.env.local` locally:

```txt
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_supabase_publishable_key
```

The code was also made backward-compatible with:

```txt
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

but the preferred Supabase prompt uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.

For Vercel, add the same variables in Vercel Project Settings -> Environment Variables.

## Files Created

```txt
middleware.ts
src/features/auth/use-auth-user.tsx
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/middleware.ts
src/lib/supabase/media.ts
src/lib/supabase/app-data.ts
src/types/database.ts
supabase/schema.sql
supabase/storage.sql
supabase/seed.sql
```

## Files Modified

```txt
.env.example
README.md
package.json
package-lock.json
src/app/login/page.tsx
src/app/page.tsx
src/components/layout/app-shell.tsx
src/components/layout/mobile-nav.tsx
src/components/layout/sidebar.tsx
src/components/ui/file-upload.tsx
src/features/activities/activities-view.tsx
src/features/admin/admin-panel-view.tsx
src/features/auth/login-panel.tsx
src/features/content/content-library-view.tsx
src/features/dashboard/dashboard-view.tsx
src/features/gesture/gesture-practice-view.tsx
src/features/help/help-view.tsx
src/features/learners/learners-view.tsx
src/features/progress/progress-view.tsx
src/features/settings/settings-view.tsx
src/types/index.ts
```

## File Removed

```txt
src/features/auth/use-demo-user.ts
```

It was replaced by `src/features/auth/use-auth-user.tsx`.

## Supabase Client Structure

The final structure used Supabase SSR helpers:

- `src/lib/supabase/client.ts`
  - Browser client using `createBrowserClient` from `@supabase/ssr`
  - Reads `NEXT_PUBLIC_SUPABASE_URL`
  - Reads `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, falling back to `NEXT_PUBLIC_SUPABASE_ANON_KEY`

- `src/lib/supabase/server.ts`
  - Server client using `createServerClient`
  - Uses `next/headers` cookies

- `src/lib/supabase/middleware.ts`
  - Refreshes sessions using Supabase SSR middleware pattern

- `middleware.ts`
  - Calls `updateSession(request)`
  - Matches normal app routes while excluding static assets

## Auth Flow

The demo role switch was removed.

Final behavior:

- `/login` uses `supabase.auth.signInWithPassword`
- After sign-in, the app reads `profiles` by `auth.users.id`
- `profiles.role = admin` redirects to `/dashboard`
- `profiles.role = teacher` redirects to `/content`
- Protected pages are wrapped by `AppShell`
- `AppShell` checks the real Supabase session/profile before rendering
- Sidebar sign out calls `supabase.auth.signOut`

## First Supabase Dashboard Setup

In Supabase Dashboard:

1. Create/open a Supabase project.
2. Put project URL and publishable key into `.env.local`.
3. Run `supabase/schema.sql` in SQL Editor.
4. Run `supabase/storage.sql` in SQL Editor.
5. Create Auth users:

```txt
admin@makalearn.local
teacher@makalearn.local
```

Give both users passwords and confirm them manually if email is not configured.

6. Run `supabase/seed.sql` in SQL Editor.

`seed.sql` assumes those two Auth users already exist, then updates their profile roles by email and attaches placeholder learners/results to the teacher profile.

## SQL Tables

`supabase/schema.sql` created:

```txt
profiles
categories
learners
learning_items
media_assets
lessons
lesson_items
activities
activity_items
practice_attempts
activity_results
```

It also created:

- Enum types for roles, statuses, activity types, media buckets, etc.
- `public.current_user_role()`
- `public.handle_new_user()`
- Trigger `on_auth_user_created` on `auth.users`
- RLS policies for authenticated users

## Storage Buckets

`supabase/storage.sql` created:

```txt
symbol-images
gesture-media
audio-files
learner-photos
```

It added authenticated read/upload/update/delete policies for those buckets.

## Data Layer

`src/lib/supabase/app-data.ts` contained:

- `fetchMakaLearnData`
- `upsertLearner`
- `insertCategory`
- `insertLesson`
- `insertActivity`
- `insertPracticeAttempt`
- `insertActivityResult`
- `updateLearningItemMedia`
- `updateProfileRole`
- `updateProfileDetails`
- `createActivityQuestions`

It mapped Supabase snake_case rows to existing MakaLearn camelCase TypeScript models.

## Upload Flow

`src/components/ui/file-upload.tsx` was updated to accept:

```ts
onUpload?: (file: File) => Promise<void>
```

and show:

- Uploading state
- Success state
- Error state

`src/lib/supabase/media.ts` handled actual Storage upload plus `media_assets` row insertion.

## Feature Pages Connected

### Content Library

Connected:

- Read users, categories, learning items, lessons, media assets
- Insert categories
- Insert lessons plus lesson items
- Upload symbol images to `symbol-images`
- Upload gesture media to `gesture-media`
- Upload audio to `audio-files`
- Update learning item media URLs

### Learners

Connected:

- Read profiles and learners
- Add learner
- Edit learner
- Archive learner
- Upload profile photo to `learner-photos`

### Gesture Practice

Connected:

- Read learners, categories, learning items
- Save simulated attempts to `practice_attempts`

Not connected:

- Gesture recognition model
- Corrective feedback model

### Activities

Connected:

- Read learners, learning items, activities
- Create manual activities
- Auto-generate activities
- Save activity questions to `activity_items`
- Save learner scores to `activity_results`

### Progress

Connected:

- Read learners, learning items, lessons, attempts, results
- Progress calculations stayed in local utility functions

### Dashboard

Connected:

- Read users, learners, items, lessons, uploads, attempts, results
- Admin and teacher dashboards use Supabase data when available

### Admin Panel

Connected:

- Read users, learners, uploads, attempts, learning items
- Update user role in `profiles`

### Settings

Connected:

- Update profile name/email in `profiles`

Password changes remained placeholder unless Supabase Auth password update/reset is expanded later.

## Hosting Notes

Recommended hosting:

- Vercel for the Next.js app
- Supabase for database, Auth, and Storage

For Vercel:

1. Add env vars in Vercel:

```txt
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
```

2. Deploy app.
3. In Supabase Dashboard -> Authentication -> URL Configuration:

```txt
Site URL:
https://your-vercel-domain.vercel.app

Redirect URLs:
http://localhost:3000/**
https://your-vercel-domain.vercel.app/**
```

For Vercel preview deploys, add a preview wildcard only if needed:

```txt
https://*-your-vercel-team-or-username.vercel.app/**
```

The SQL does not need to change just because the app is hosted.

## Verification Commands Used

```bash
npm.cmd run lint
npm.cmd run build
```

Both passed.

Known warning:

```txt
@next/next/no-img-element
```

This warning came from showing arbitrary Supabase image URLs with plain `<img>`. It can be handled later by configuring `next/image` remote domains for the Supabase project.

## Reverting Back to Non-Supabase

To go back to a non-Supabase app, restore:

- Demo/local auth hook
- Demo login buttons
- Local role state
- Feature pages using `src/data/mock-data.ts`
- Remove middleware/session dependency
- Remove Supabase SQL files if not needed
- Remove `@supabase/ssr` and `@supabase/supabase-js` if fully unused

Keep this note if you want to reapply the integration later.
