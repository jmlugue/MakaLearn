# MakaLearn working guidance

Read `SESSION_BOARD.md` first and register your session before editing. Preserve existing staged/working edits and check for concurrent work. Move your own entry to Recently completed when finished.

The current product reference is [docs/current-system.md](docs/current-system.md). [STYLE_GUIDE.md](STYLE_GUIDE.md) owns the existing UI. [AGENTS.md](AGENTS.md) contains the mandatory activity contract. Where older briefs or skill examples disagree, current behavior and explicit owner decisions win.

## Current scope

- Teachers build Content materials/collections/categories/media, create activities, and use the teacher Preview. Admins manage accounts and view teaching content. Admins do not create/edit/delete teaching content. Both roles can enter Student mode.
- Student mode provides Playground, Gesture practice, and Activities. Only Student mode is learner-facing. Teachers sign in to Content; admins sign in to Admin.
- No learner-management or progress page exists. `/learners` redirects to `/content`. Do not restore learner tracking or gesture-attempt persistence.
- Collection is the visible name. The `collections` and `collection_items` invoker views retain legacy lesson backing tables. Activities can belong to a collection through the existing ID/compatibility links.
- Supabase Auth/Database/Storage provide runtime persistence. Browser storage is only a preference/guide fallback, never the database for app records or AI quota/cache.
- Playground uses standard-English AI grading first, permanent positive/negative decisions, and fixed local feedback. Explicit algorithm mode and failures use the existing local MSAV fallback. Material preparation is a separate process.
- Recognition is real and local: MediaPipe plus a trained seven-label model. Free practice and Guided 7 never save gesture attempts. Uploading a custom gesture reference does not train recognition.
- Teacher preview scores stay in memory. Completed teacher-run Student Mode rounds save score/counts/duration to `activity_results` for Admin usage. Admin Student Mode rounds are not tracked. This is not individual learner assessment.

## Activities: non-negotiable option contract

Read this and the Activities contract in AGENTS.md before inspecting/changing option generation, media lookup, previews, scoring, or either player.

- Active types: Match word to symbol, Fill in the blank, Drag and drop. Legacy Choose the picture, Choose the word, and gesture activities are retired.
- All answer choices are eligible PECS materials. Never resolve a gesture as an answer or distractor, including shared PECS/Gesture labels.
- Use the full eligible PECS library, not only selected correct cards. Randomize each question and round, include the correct answer exactly once, and remove duplicates.
- Preserve semantic-conflict exclusions. Another reasonable answer must never be marked wrong. Retain/add regression cases when exclusions change.
- Built-in choices use dedicated `public/pecs/generated_cards_no_text` artwork. Custom choices require `activity_image_url`. Never fall back to labelled Content art or visible answer-word placeholders.
- Legacy `question.options` are untrusted and are resolved/filtered at runtime. Legacy Choose the word still displays word-free pictures even though scoring uses words.
- Keep teacher/student players, all question types, dropped cards, results, and interactive samples consistent. Prompt text and screen-reader labels may contain words.
- Pagination must not shrink the eligible distractor library. Run `npm run test:activities`, TypeScript, lint, material validation, and build with no development server running after option changes. Tests must cover PECS-over-gesture resolution and all no-text assets.

## Approved reliability behavior

- Duplicate labels are blocked within a material type on creation/rename, ignoring case and redundant spaces. PECS and Gesture can share a word. Existing duplicate records are retained for separate review.
- Deleting an in-use material removes its links/questions and retains the parent collections/activities. A database guard blocks deletion of the last card/question. Confirmations use the current Dialog style and explain visible impact. Hidden private dependencies are protected server-side.
- Media deletion retains a retryable Media row until Storage removal and material unlinking finish. Partial cleanup must never claim full success. `deletion_pending` identifies records needing an explicit retry.
- Show persistent loading errors with Retry instead of empty libraries or zero usage. Read feature-specific data and paginate full libraries/history.
- Material/collection/activity forms ask before discarding meaningful changes. Successful Save closes normally. Do not add extra acknowledgment gates.
- Settings take effect immediately. Partial, serialized saves and database row locks prevent unrelated settings from overwriting each other. Failed visibility changes are reported/reverted. Failed guide dismissal must not immediately reopen the welcome tour.
- Gesture feedback requires active teacher/admin authentication. Atomic service-only reservations allow 200 provider attempts per rolling hour per account. Local-only responses do not consume quota. Failure/limit uses existing local feedback without stopping camera practice.
- New-material preparation makes one initial attempt and permits explicit retries. No scheduled retries or provider retry loop. One active claim per material, two-minute stale-claim expiry, 60-second same-material cooldown, 10 attempts/hour and 40/rolling-day per teacher. Failed attempts count. Late completion must not overwrite an edit/new claim. Reuse valid completed profiles.
- Short success notifications dismiss automatically. Errors/recovery messages wait for dismissal; timed messages pause on hover/focus.

## UI and implementation conventions

- Follow STYLE_GUIDE. Reuse the existing soft blue glass panels, typography, category/entity colors, forms, dialogs, and mobile/tablet layouts. No redesign is authorized by this reliability batch.
- Keep instructions short, simple, and direct. No semicolons in instructions or em dashes in visible copy. Explain user tasks rather than database/model terminology.
- Gemini corrective feedback and activity prompts must explicitly ban semicolons and em dashes. Reject generated wording that breaks this rule and use the existing local fallback. Run `node --test scripts/test-instruction-copy.mjs` with the focused provider tests after wording changes.
- Use Preview outside Student mode and Play inside it. The login identifier is Email. Voice playback says Reading aloud. A finished guided summary closes with Back to practice.
- Keep PECS template previews and separate word-free Activity images. Do not reintroduce removed blank-caption confirmations or reminder panels.
- Use clear types, named helpers, and moderate major-file comments. Avoid unnecessary dependencies and giant additions to the gesture view.
- Use npm. Do not start the app dev server automatically. Do not build or clear `.next` while one is running.
- Each worktree installs its own dependencies with `npm ci`. Preserve the lockfile for repairs; intentional dependency changes include both manifests.

## Backend and verification

- Migrations are the tracked current schema. `schema.sql` is historical and must not be replayed on hosted Supabase. Existing migration history still assumes a core schema; fresh-project bootstrap remains deferred.
- Public signup is disabled. Profiles use active status and trusted database roles. Service-role keys stay server-only. Invoker views/RPCs preserve RLS; only narrow private triggers use definer access with explicit caller checks.
- The review migration `20261026065201_review_reliability_guards.sql` adds quota reservations, preparation claims, duplicate/deletion guards, partial settings patches, and retryable media cleanup metadata.
- Normal checks: existing npm test suites, `node --test scripts/test-review-reliability.mjs scripts/test-material-categories.mjs`, `npx tsc --noEmit`, `npm run lint`, `npm run build`.
- `scripts/test-review-guards-db.sql` must run inside BEGIN/ROLLBACK. It exercises role access, quota boundaries, stale preparation, duplicate labels, last-card deletion, and independent settings patches without retaining fixtures.
- `npm run validate:materials` requires Supabase URL and service-role configuration. Do not claim hosted/material/browser verification when credentials or runtime access are absent.
- Real signed-in phone/tablet/desktop, camera, provider, and Storage round trips remain separate acceptance evidence. Mocks and static fixtures cannot establish live recognition accuracy.

## Deferred owner decisions

After the defense on Wednesday October 28, 2026 (earliest October 29): dependency/security-advisory remediation, a compatible framework upgrade, fresh-project setup, and new CI/check automation. Do not upgrade dependencies for the defense batch.

Standalone keyboard-overlay changes and full-history admin log search were excluded. Full acceptance checks follow implementation; required focused checks are still run during development.

## Historical notes

The prior chronological handoff is preserved in [docs/archive/claude-history-2026-10-26.md](docs/archive/claude-history-2026-10-26.md). It contains superseded behavior and is not current guidance. Consult it only for historical rationale. Current database readiness, model implementation, and file maps remain linked from README.
