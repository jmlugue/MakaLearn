---
name: future-supabase
description: Use when preparing or modifying MakaLearn Supabase Auth, tables, Storage, RLS, environment variables, or backend integrations.
---

# MakaLearn Supabase integration

Supabase is already the runtime backend. The old mock-first/future-integration brief is superseded by `CLAUDE.md` and `docs/current-system.md`. Also load the Supabase plugin skill for current platform guidance.

- Auth uses active teacher/admin profiles. Public signup is disabled; guarded admin routes provision accounts.
- Runtime materials, categories, media, collections, activities, settings, result usage, and AI cache/quota use Supabase. Browser storage is not record persistence.
- No learner management or saved gesture attempts. Empty compatibility views are intentional. Keep `activity_results`, which stores teacher-run Student Mode completions.
- Collection API views use invoker security over legacy backing tables. Preserve current private/shared RLS and creator rules. Admins are view-only for teaching content.
- Keep service-role credentials server-only. Verify active accounts at API boundaries. Atomic server reservations protect paid requests; browser callers cannot set/reset their quota.
- Storage uses symbol-images, gesture-media, audio-files. Preserve file-size/type checks, standard/word-free image separation, and retryable media cleanup records.
- Use migrations for reviewed schema changes; never replay historical `schema.sql` or reset the hosted project. Fresh-project bootstrap is deferred until after the defense.
- Verify changes with focused local tests and rolled-back database checks. Never claim live storage/auth/provider behavior without exercising it.
