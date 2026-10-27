# MakaLearn current system

This is the current product reference. [CLAUDE.md](../CLAUDE.md) covers working conventions, [STYLE_GUIDE.md](../STYLE_GUIDE.md) covers the existing UI, and [AGENTS.md](../AGENTS.md) contains the mandatory activity-option contract. Older handoff notes describe historical states and must not restore retired behavior.

## Accounts and navigation

- Teachers sign in with email/password and open Content. Admins open Admin.
- Admins manage accounts and view teaching content. Teachers create, edit, delete, and preview teaching content. Both roles can enter Student mode.
- Student mode contains Playground, Gesture practice, and Activities. Outside Student mode, activities are teacher previews. Inside Student mode, activities are played by learners under teacher supervision.
- Learners do not sign in and have no managed profiles in the current app. The old `/learners` URL redirects to Content. Gesture attempts are never saved.
- Public signup is disabled. Admins provision accounts. Profile contains personal name/password controls; Settings contains display, guidance, motion, and device voice preferences.

## Content

- Materials are PECS cards or gesture references. Collections are ordered materials. Categories organize materials. Media owns uploaded files; material details control which files are attached.
- Uploader attribution uses the saved `uploaded_by` account and its current name for both roles. Content loads only IDs/names through `content_author_names`, while full profiles retain self/admin access. Missing names show Unknown uploader. Legacy imported media/material ownership was corrected to Jordan Lee on October 27 using `supabase/maintenance/correct-legacy-media-owner.sql`. New interactive uploads keep the signed-in teacher as uploader.
- New or renamed materials cannot reuse another label within the same type. Comparison ignores case and redundant whitespace. A PECS card and a gesture may share a label. Existing duplicates are retained for separate review.
- A PECS upload can produce a labelled Content/Playground picture and a word-free Activity picture. Existing labelled sources require a separate word-free Activity picture. Never remove the dedicated Activity-image requirement or reintroduce a blank-caption acknowledgment gate.
- Images are limited to 10 MB, audio to 20 MB, and gesture video to 50 MB. Stored filenames follow `word_category`; teachers do not need to rename files before selecting them.
- A custom gesture upload is a reference. It does not add a recognition class to the trained model.
- Shared teaching content is collaborative; private collections/activities are visible only to their creator and admins. Current database policies enforce this. Admins remain read-only for teaching content.
- Material deletion removes that material's collection links and activity questions, while keeping parent records and other cards. The database blocks deletion when it would leave an affected collection or activity without cards/questions. The confirmation explains visible dependencies; the server also protects hidden dependencies.
- The Content Media tab fetches 24 file records per page on demand. All, Images, and Audio share pagination, with full-library search (including material/uploader), linked filters, stable sorting, count-only badges, and retryable page errors. Material file removal looks up only the matching file. Tablet thumbnails use explicit full-width square containers.
- Media deletion retains its row with `deletion_pending` until Storage removal and material unlinking finish. A failure remains retryable through Delete in Media. Material deletion can succeed while individual media files still need cleanup, which is reported explicitly.
- Material, collection, and activity creation/edit forms protect unfinished work with a discard confirmation. Successful Save closes normally.

## Activities and results

- Teachers create Match word to symbol, Fill in the blank, and Drag and drop. The legacy Choose the picture, Choose the word, and gesture activity types remain retired.
- All visible answer options are eligible PECS pictures with dedicated word-free artwork. Never use gesture records or standard labelled artwork as fallbacks.
- Build randomized choices from the full eligible library, remove duplicates, include the correct answer once, preserve semantic-conflict exclusions, and sanitize legacy saved options at playback. This applies to every player, dropped card, result, and interactive sample.
- The teacher player is a Preview. Its score is held in memory. A teacher-run completed Student Mode round saves score, correct/incorrect counts, teacher/activity attribution, completion time, and duration to `activity_results`. Admin Student Mode play is not recorded by the completion callback. No individual learner history is created.
- Collections can have multiple activities. Current compatibility links use activity IDs and older `related_activity_id`/title fallbacks. Collections do not themselves generate activities on Save.

## Playground and gesture recognition

- Playground supports up to five ordered cards with tap or drag placement, Check, Listen, and Clear. It uses the standard picture and one device-selected browser voice.
- Standard-English AI checking is primary unless `PLAYGROUND_CHECKER_MODE=algorithm`. Saved positive/negative decisions are reused. Fixed local feedback is shown; model prose is never displayed. Provider/storage failure uses the existing local MSAV algorithm. Teacher material preparation remains separate from grammar checking.
- Owner-approved AAC exception: exactly I + am + one Family/People card is a valid sentence without an article, including I am mother/father/teacher/friend. The authenticated server checks saved categories before cached/model decisions. The local fallback shares this rule. Other AI constructions retain standard English grammar. Matching hosted negative decisions were corrected with an audit trail using `supabase/maintenance/allow-playground-person-identities.sql`.
- The built-in words have reviewed preparation rules. New PECS materials need a usable picture and a validated saved preparation profile before becoming available in Playground. Audio is optional.
- New material preparation has one initial request and explicit teacher retries. There are no scheduled retries or provider retry loops. Completed preparation is reused. A claim expires after two minutes, retrying one material has a 60-second cooldown, and each teacher has 10 attempts per rolling hour and 40 per rolling 24 hours. Only one claim runs per material; stale completions cannot overwrite edits or newer claims.
- Recognition runs locally with MediaPipe and the trained seven-label model: I want to go to toilet, I want to eat, I want to drink, Help, Yes, No, and Sit down. It supports Free practice and Guided 7. Uploaded references do not retrain the model.
- Gesture corrective feedback sends structured recognition results, never camera frames, to the optional provider. Its endpoint verifies an active teacher/admin and permits 200 reserved provider attempts per rolling hour per account across devices. Provider failures count. Local-only feedback does not reserve an attempt. Denial/unavailability preserves local feedback and camera practice.

## Reliability and settings

- Content, Activities, Playground, gesture references, and Admin show persistent retryable load errors. A failed read must not be presented as an empty library or a trustworthy zero usage value.
- Feature-specific data reads omit unrelated tables. Growing libraries and usage are read in stable pages; activity distractors must still receive the complete eligible library.
- Preference changes remain immediate. Saves are queued locally and patched atomically in the database, so unrelated changes do not overwrite each other. Activity visibility changes report failures and return to the last saved state. Guide dismissals retain a local fallback so a failed dismissal cannot repeatedly reopen the tour.
- Display preferences save per account. Extra-large text has a browser-specific extension to the stored Large setting. Voice and voice speed apply to this browser/device. Card recordings are unchanged.
- Short success notifications dismiss automatically. Errors and explicitly persistent recovery messages wait for dismissal. Timed messages pause on hover or keyboard focus.

## Current backend and checks

Auth and runtime records use Supabase. Collection views preserve the legacy `lessons`/`lesson_items` backing tables with invoker security. Service-only AI reservations are stored in `private.optional_ai_requests`; browser roles cannot read or modify that ledger or invoke its reservation functions. Settings patches run as the signed-in account under existing RLS.

The approved review guards are tracked in [20261026065201_review_reliability_guards.sql](../supabase/migrations/20261026065201_review_reliability_guards.sql), applied to the connected hosted project on October 26. Application changes remain undeployed. See [the implementation verification](system-review-2026-10-26.md#implementation-update-26-october) for checks and limits. [test-review-guards-db.sql](../scripts/test-review-guards-db.sql) must be run inside a rolled-back transaction. Current history still assumes an existing core schema. A clean-project bootstrap is deferred, and `schema.sql` must not be replayed on the hosted database.

Run existing npm suites plus `node --test scripts/test-review-reliability.mjs scripts/test-material-categories.mjs`, TypeScript, lint, and build. Activity changes additionally require `npm run test:activities` and material validation. Never build while an app development server is running.

## Deferred work

- After the Wednesday October 28 defense: dependency advisory remediation and a compatible framework/toolchain upgrade, fresh-project database bootstrap, and new CI/check automation. Earliest start is October 29. This is a backlog task, not an automatic update.
- Standalone keyboard-overlay changes and full-history admin log search were excluded from this review batch.
- Signed-in phone/tablet/desktop, real upload/storage, camera, and provider acceptance checks follow the implemented changes. Local fixtures and mocks do not establish live device/model accuracy.

Learning artwork and reference media are classroom placeholders, not official Makaton content or validated clinical assessment material.
