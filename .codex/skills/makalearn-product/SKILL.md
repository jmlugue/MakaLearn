---
name: makalearn-product
description: Use when deciding MakaLearn product behavior, roles, content, collections, gesture practice, activities, Playground, and Student mode.
---

# MakaLearn product

Read `CLAUDE.md` and `docs/current-system.md` for current behavior. `AGENTS.md` began as an older brief; its activity-option contract remains mandatory. Current owner decisions override historical examples.

- Teacher-guided communication support with teacher/admin accounts and Supabase persistence.
- Teachers create Content and activities. Admins manage accounts and view teaching content. Both can enter Student mode.
- Materials and ordered collections live in Content with categories and Media. Collection is the current visible name.
- Student mode contains Playground, real camera gesture recognition, and activities. Teacher activities are Preview; Student Mode activities are Play.
- No Learners/Progress page, learner login, saved gesture attempt, or individual learner tracking.
- Teacher previews are session-only. Completed teacher-run Student Mode rounds save results/duration for Admin usage.
- Active activities are Match, Fill in the blank, and Drag and drop. Choices use PECS materials only, word-free artwork, the full eligible library, per-question/round randomization, unique choices, and semantic-conflict exclusions. Sanitize legacy options in all renderers and run focused activity regressions.
- Recognition supports seven trained signs. Uploading a gesture reference does not add a recognition class.
- New/renamed material labels must be unique within type. Deletion must not leave linked collections/activities empty. Partial media cleanup remains retryable.
- Preserve short copy and existing UI. Do not add retired scope or change result persistence without an explicit request.
