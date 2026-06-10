---
name: nextjs-app
description: Use this skill when building or modifying MakaLearn's Next.js App Router structure, routes, components, local data, and TypeScript architecture.
---

# Next.js App Skill

Use this skill for Next.js implementation work in MakaLearn.

## Stack

Use:
- Next.js
- TypeScript
- App Router
- Tailwind CSS
- shadcn/ui
- lucide-react
- Recharts

## Route structure

Use routes like:

```txt
src/app/
├─ page.tsx
├─ login/page.tsx
├─ dashboard/page.tsx
├─ learners/page.tsx
├─ content/page.tsx
├─ content/[id]/page.tsx
├─ gesture-practice/page.tsx
├─ activities/page.tsx
├─ progress/page.tsx
├─ settings/page.tsx
├─ help/page.tsx
└─ admin/page.tsx
```

The exact route names may be adjusted, but keep them simple and understandable.

## Component structure

Prefer reusable components:

```txt
src/components/
├─ layout/
│  ├─ app-shell.tsx
│  ├─ sidebar.tsx
│  ├─ mobile-nav.tsx
│  └─ page-header.tsx
├─ common/
│  ├─ empty-state.tsx
│  ├─ loading-state.tsx
│  ├─ stat-card.tsx
│  └─ confirm-dialog.tsx
├─ content/
├─ learners/
├─ gesture/
├─ activities/
├─ progress/
└─ admin/
```

## Data and types

Keep placeholder data in:

```txt
src/data/mock-data.ts
```

Keep shared types in:

```txt
src/types/index.ts
```

Use clear types for:
- UserRole
- AppUser
- Learner
- LearningItem
- Category
- Lesson
- Activity
- PracticeAttempt
- ActivityResult
- MediaAsset

## Server/client components

Use server components by default.

Use `"use client"` only when needed for:
- form state
- tabs
- modals
- filters
- webcam preview
- drag/drop
- local scoring
- interactive activity player
- accessibility toggles

## Local-first rule

For the first build:
- Use mock data and local state.
- Do not require Supabase environment variables to run the UI.
- Prepare integration points but do not block the app if Supabase is not configured.

## Build quality

Ensure:
- TypeScript types are clear.
- Routes compile.
- Navigation works.
- Mobile layout works.
- `npm run build` can pass.
