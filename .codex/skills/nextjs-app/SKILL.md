---
name: nextjs-app
description: Use when modifying MakaLearn Next.js App Router routes, components, data loaders, and TypeScript architecture.
---

# MakaLearn Next.js application

Follow `CLAUDE.md`, `docs/current-system.md`, and `STYLE_GUIDE.md`. Historical local-first/learner scaffolding instructions are superseded.

Use Next.js App Router, TypeScript, Tailwind, existing local UI primitives, and lucide-react. Preserve the installed dependencies for the defense batch.

Current routes: `/`, `/login`, `/content`, `/activities`, `/playground`, `/gesture-practice`, `/admin`, `/profile`, `/settings`, `/help`. `/learners` is a compatibility redirect. Do not add dashboard/progress/learner routes from the original brief.

Keep feature components under `src/features`, reusable components under `src/components`, persistence/server helpers under `src/lib`, pure rules under `src/utils`, and models under `src/types`. Use server components by default and client components for interaction. Runtime app records require Supabase; show a truthful retryable failure instead of mock success or empty data on error.

Keep feature data requests independent from unrelated tables and paginate full libraries. Never reduce the eligible PECS activity option pool as a side effect. Preserve auth/role guards, private/shared access, and server-only credentials.

Use npm and `npm ci` for a new worktree or lockfile changes. Do not start a development server automatically. TypeScript, lint, focused tests, and production build must pass before handoff. Do not build while a development server is running.
