# Session board

Use this file to coordinate work across terminal sessions in this repository. It records current work, not project requirements; `CLAUDE.md` and `AGENTS.md` remain the sources for project guidance.

## How to use it

1. At the start of a session, read this file and the project instructions. Check the active entries before changing files.
2. Add a brief entry under **Active sessions** before editing. Give it a unique ID (for example, a date, time, and short topic), your goal, and the files or areas you expect to touch. Use `TBD` if the files are not known yet.
3. Update only your own entry when the scope changes. Check this file again before editing an area another session lists. Coordinate with the user if the work would overlap.
4. When finished, move your entry to **Recently completed** with a short outcome and any follow-up. Keep recent history concise and remove old completed entries as it grows.
5. Do not put secrets, credentials, or personal learner data here. This file does not lock files or automatically synchronize separate worktrees; entries are a coordination signal.

## Active sessions

### 2026-09-28-supabase-gemini-pr
- Status: active
- Goal: Audit, commit, push, and open one PR for the completed Supabase account/auth work and Gemini activity-drafting changes currently in the working tree.
- Files/areas: Full current diff, verification results, Git branch/commit, and PR description. No new product behavior planned.
- Notes: The separate semantic-distractor session lists option files, which are not currently modified in this diff.

### 2026-09-25-semantic-activity-distractors
- Status: active
- Goal: Restore runtime semantic-conflict filtering so documented activity options never include another technically valid answer.
- Files/areas: Activity option rules/builder, question creation and playback, focused tests, and handoff notes.
- Notes: Follow-up discovered while formalizing the mandatory activity contract; no active-session overlap.

<!-- Add one section per session. Example:
### 2026-09-21-1430-content-library
- Status: active
- Goal: Add category filtering to the content library.
- Files/areas: `src/app/...`, `src/components/...`
- Notes: None.
-->

## Recently completed

### 2026-10-02-ai-regenerate-variation
- Outcome: Repeat Inspire me with AI clicks now send each unlocked current sentence as untrusted wording to replace, ask Gemini for a meaningfully different situation with higher-but-guarded variation, reject identical returned text, and choose a different checked bank sentence if fallback is needed. Locked rows remain excluded.
- Files/areas: Activity creator request payload, draft prompt/context/validation/fallback and temperature, API request handling, focused tests, README/CLAUDE, and this session board. Activity options, players, scoring, and gestures were unchanged.
- Verification: `npm run test:activities` (58 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, and `git diff --check` passed. No live Gemini call was made, avoiding an unnecessary API charge. Material validation still reports only the unchanged Eat/Drink duplicate-label warnings.

### 2026-10-02-ai-regenerate
- Outcome: Repeat clicks on Inspire me with AI now regenerate every unlocked sentence immediately. Explicit regeneration bypasses the 60-second same-material cooldown but continues to enforce the 10/hour and 40/day model-call limits. True quota-limit responses are no longer presented as successful regeneration.
- Files/areas: Activity draft rate-limit helper/route, activity creator feedback, focused tests, README/CLAUDE, and this session board. Lock behavior, activity options, players, scoring, and gestures were unchanged.
- Verification: `npm run test:activities` (55 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, and `git diff --check` passed. Material validation still reports only the unchanged Eat/Drink duplicate-label warnings.

### 2026-10-02-ai-draft-locks
- Outcome: Inspire me with AI now asks Gemini to self-check all sentences in one response and uses checked question-bank wording silently when a model sentence fails, instead of showing a Gemini rejection or spending a second wording-repair call. The single retry remains only for transient provider failures. Fill in the blank rows now have a touch-friendly lock control that excludes locked sentences from AI requests while keeping them editable.
- Files/areas: Activity draft prompt/completion logic and API, activity creator lock state/UI, focused tests, README/CLAUDE, and this session board. Activity options, players, scoring, and gesture behavior were unchanged.
- Verification: `npm run test:activities` (54 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, and `git diff --check` passed. Material validation still reports only the unchanged Eat/Drink duplicate-label warnings.

### 2026-09-28-simple-ai-family-prompts
- Outcome: Tightened Gemini activity drafting so known materials include approved simple question-bank examples, vague praise is rejected, and family materials cannot be defined through leader/head/provider/protector authority stereotypes. The reported Father sentence is a regression case; direct wording such as `I call my dad ____.` passes. Prompt/cache version is now `activity-prompt-v6`, so earlier abstract cached drafts are not reused.
- Files/areas: Activity AI prompt/validator, focused tests, CLAUDE, and this session board. Teacher-written prompts, question-bank content, activity options/players, and gesture recognition were unchanged.
- Verification: `npm run test:activities` (50 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `git diff --check`, and a live Father Gemini request passed; the live output was `I give my ____ a hug.` Build was skipped because the user's dev server is running on port 3000. Material validation still reports only the unchanged Eat/Drink duplicate-label warnings.

### 2026-09-28-gemini-timeout-cooldown-fix
- Outcome: Fixed the reported first-use activity-draft failure. Gemini now has 30 seconds instead of 12, one transient timeout/429/5xx may use the existing single quota-counted retry, and the 60-second same-material cooldown starts only after usable Gemini output. Failed requests still count toward hourly/daily limits but no longer make an immediate retry say the limit was reached. Cooldown wording now distinguishes waiting from an actual hourly/daily limit.
- Files/areas: Activity draft API, rate-limit utility/tests, activity form notice, README/CLAUDE, and this session board. No schema, option-builder, player, or gesture-recognition changes.
- Verification: Live `ai_usage_events` showed two approximately 12-second model failures followed by cooldown blocks, confirming the cause. `npm run test:activities` (48 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, and `git diff --check` passed. Material validation still reports only the unchanged Eat/Drink duplicate-label warnings.

### 2026-09-28-gemini-draft-guardrails
- Outcome: Added SPED-friendly Gemini activity-draft grounding and strict server validation, one quota-counted repair call for only invalid/missing items, checked question-bank fallback with per-card teacher messages, complete-batch-only caching, and revised limits of 10 calls/hour, 40/day, and a 60-second same-material cooldown. Teacher-written questions retain the existing flexible checks; Match, Drag, activity options, and gesture recognition were untouched.
- Files/areas: Activity draft utility/API/form, pure rate-limit utility, focused tests, README/CLAUDE, and this session board. Reused the existing `ai_usage_events` table, so no database migration was needed.
- Verification: `npm run test:activities` (46 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, `git diff --check`, and a direct Gemini smoke request passed. The first smoke attempt received transient HTTP 503; the immediate retry succeeded with `gemini-3.5-flash-lite` and passed local validation. Material validation still reports only the unchanged Eat/Drink duplicate-label warnings.

### 2026-09-28-gemini-activity-drafting
- Outcome: Replaced Hugging Face activity-question drafting with Gemini using the dedicated server-only `GEMINI_ACTIVITY_API_KEY` and independent `GEMINI_ACTIVITY_MODEL`. Gemini cache reads and new generation rows are provider-specific; legacy Hugging Face rows remain only as valid history. Gesture recognition and its separate corrective-feedback key/route were untouched.
- Files/areas: Activity draft API/utility/form source handling, focused draft tests, environment/setup documentation, database types/schema, hosted migration `20260928053842_use_gemini_for_activity_drafts.sql`, and this session board.
- Verification: Hosted default/constraint/enum and migration history verified; Supabase security advisor shows only the pre-existing leaked-password-protection warning. `npm run test:activities` (38 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, and `git diff --check` passed. A live Gemini request remains pending until the user adds the new activity API key.

### 2026-09-28-account-request-approval
- Outcome: Added a public teacher account request page and admin approval queue. A submission creates only a pending database row; approval creates an active teacher Auth account with an admin-set temporary password, and rejection creates no Auth user. Duplicate or already-registered emails receive the same neutral public response. Public Supabase signup remains disabled.
- Files/areas: `/request-account`, login and Admin Accounts UI, public/admin account-request routes, Supabase data/types/schema, three hosted migrations, focused tests, README/CLAUDE, and this session board.
- Verification: Hosted RLS and grants confirm no anonymous table access or authenticated insert access, admin-only select/update policies, and all expected constraints/indexes. `npm run test:account-requests` (5 pass), `npm run test:auth` (4 pass), `npx tsc --noEmit`, `npm run lint`, `npm run build`, `git diff --check`, migration dry-runs/pushes, and Supabase advisors passed for the new scope. The remaining leaked-password-protection warning is an existing Auth setting.

### 2026-09-28-signup-admin-hardening
- Outcome: Closed public Supabase signup while keeping email/password sign-in enabled, and applied the hosted trigger migration so caller-controlled user metadata can never assign an active or admin profile. New Auth users default to invited teachers, inactive profiles receive no application role, admin provisioning remains guarded, and failed second-step provisioning cleans up both provisional records so the email can be retried.
- Files/areas: Supabase Auth configuration, `supabase/config.toml`, `supabase/migrations/20260927225337_harden_new_user_profile_defaults.sql`, `supabase/schema.sql`, admin account creation, auth regression scripts, seed/setup documentation, and this session board.
- Verification: Hosted management and public Auth settings report signup disabled, email enabled, and anonymous signup disabled. A hostile live signup returned HTTP 422 `signup_disabled` and created no user. Hosted trigger/function grants and active-status authorization helper were inspected; `npm run test:auth` (4 pass), `npx tsc --noEmit`, `npm run lint`, `npm run build`, security advisors, and both Git diff checks passed. The combined credentialed `test:auth:live` suite could not run because `TEST_ADMIN_EMAIL` is absent; its public-signup boundary was verified directly instead.

### 2026-09-27-full-data-path-audit
- Outcome: Audited the live Supabase schema, RLS, grants, storage, data integrity, and all non-account application data paths after the admin view-only change. Admin content mutations are blocked, teacher CRUD and private ownership rules work, protected data is hidden from anonymous/deactivated users, and rolled-back integration probes left no test data. Reconciled the local migration filenames with the hosted migration history; no schema or production data was changed by this audit.
- Files/areas: Live Supabase project, Supabase-backed helpers/routes across `src/`, `supabase/migrations/`, validation scripts, and this session board.
- Verification: `npm run test:activities` (27 pass), `npm run validate:materials`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, live RLS/integrity/privilege probes, Supabase advisors, migration list, and linked dry-run passed. Signed-in application DB suites were not run because their `TEST_*` account credentials are absent.
- Follow-up: The signup trigger still trusts user-supplied role metadata and can create an admin profile; this separate high-severity authorization issue needs remediation. Eleven unreferenced legacy Storage objects are optional cleanup candidates, and leaked-password protection remains disabled on the current Supabase plan.

### 2026-09-26-admin-supabase-audit
- Outcome: Repaired the live admin activate/deactivate failure by applying the missing `service_role` grants for the private role helper. The hosted migration is recorded as `20260927113744_service_role_private_schema`; the existing routes continue to use the signed-in admin client. The separate signup-to-admin vulnerability remains documented for follow-up.
- Files/areas: Live Supabase grants/migration history, `src/app/api/admin/account-status/route.ts`, `src/lib/supabase/admin-guard.ts`, `supabase/migrations/20260927113744_service_role_private_schema.sql`, `CLAUDE.md`, and this session-board entry.
- Verification: Live privilege checks returned true for private-schema usage and helper execution. Rolled-back/no-persistent-change profile update checks succeeded through both authenticated-admin and service-role execution paths. Supabase's security advisor reported only the pre-existing leaked-password-protection warning.

### 2026-09-26-free-practice-reference-card
- Outcome: Free Practice now shows the right-side gesture media and Play controls directly, with no flip wrapper, rotation, keyboard flip behavior, or click prompt. Guided practice keeps its prior flip interaction.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`, `CLAUDE.md`.
- Verification: `npm run test:feedback`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` passed.

### 2026-09-26-eat-gesture-label
- Outcome: Renamed the fixed Eat recognition phrase to "I want to eat" everywhere while preserving the `gesture-eat-food` ID and trained `eat` class. Regenerated and offline-audited the spoken clip, published it as cache-safe `gesture-eat.wav`, and updated the live Supabase learning item plus all linked media titles.
- Files/areas: Gesture label/model/feedback mappings, fixed-label filters, learning-media uploader/validator, seed/docs/tests, `public/audio/gesture-eat-food.wav`, live `learning_items` and linked `media_assets` records.
- Verification: Offline WAV transcript matched "I want to eat"; gesture feedback/capture/stability tests, `npm run test:audio`, `npx tsc --noEmit`, `npm run lint`, live `npm run validate:materials`, `npm run build`, and `git diff --check` passed.

### 2026-09-26-activity-edit-step
- Outcome: Activity editing now opens on the Cards step instead of Review, so teachers can change learning materials immediately and Next clearly advances to Review rather than appearing to loop.
- Files/areas: `src/features/activities/activity-form-dialog.tsx`.
- Verification: `npm run test:activities` (18 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, and `git diff --check` passed.

### 2026-09-26-related-pecs-distractor-audit
- Outcome: Confirmed that related target cards may stay in the same activity as separate questions, while each question's generated wrong options exclude cards that could also be reasonable answers. Added direct regression coverage for Eat with Bread/Rice and Drink with Water/Milk.
- Files/areas: `scripts/test-activity-option-sets.mjs`, `scripts/test-activity-rules.mjs`.
- Verification: `npm run test:activities` (18 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, and `git diff --check` passed. Build skipped because the user's Next.js development server is running.

### 2026-09-26-activities-design
- Outcome: Teacher Activities UI cleanup. Shapes icon for Activities; short type names with icons on badges; type colors off blue and teal (violet, orange, yellow, pink); default names like "Feelings match activity" (`src/utils/activity-title.ts`); creator steps Start (own cards or searchable lesson list, format tiles), Cards (5-slot tray via `MaterialsStep tray="slots"`), Review (name with Private switch, summary line, one question row per card, single AI button); one-line card title and meta line; preview shows demo before cards.
- Files/areas: `nav-items.ts`, `guide-content.ts`, `activity-labels.ts`, `activity-title.ts`, `activity-helpers.ts` (`activityTypeTones` only), `activity-type-badge.tsx`, `activity-card.tsx`, `activity-preview-dialog.tsx`, `activity-library.tsx`, `activity-form-dialog.tsx`, `activities-view.tsx`, `lesson-form-dialog.tsx`, `activity-sample.tsx`, `STYLE_GUIDE.md`, `CLAUDE.md`.
- Verification: `npx tsc --noEmit`, `npx next lint --dir src`, `npm run test:activities` (17 pass). Card, preview, and creator checked on a temporary sample page at laptop and phone size (page removed). Not verified signed in; `npm run build` not run because a dev server was running.

### 2026-09-26-activities-finalize
- Outcome: Choose the word retired (4 types remain). Shared per-type instructions in Student mode, teacher player, and Listen. Contextual Fill in the blank sentence for every PECS card, old built-in sentences upgraded at play time, AI draft request and cache version (v2) updated. Meaning-group distractor rule for all types (covers the semantic-distractors entry, pending elugs). Activity create/edit/delete moved to `src/lib/supabase/activity-records.ts` with clearer refusal messages. Instruction banner fits phones.
- Files/areas: `activity-helpers.ts` (not `activityTypeTones`), players, `activity-option-sets.ts`, `fill-blank-prompts.ts`, `activity-ai-draft.ts`, `api/activity-draft/route.ts` (max tokens), `activity-records.ts`, `app-data.ts`, `scripts/test-activity-rules.mjs`, `scripts/test-activity-records-db.mjs`, `package.json`, `CLAUDE.md`.
- Verification: `npm run test:activities` (17 pass), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials` (only the known Eat/Drink duplicates). Players checked on a temporary sample page at laptop and phone size (page removed). `npm run build` not run because a dev server was running. `npm run test:activities:db` waits on test accounts.

### 2026-09-25-activity-agent-contract
- Outcome: Added a mandatory activity-option contract to the repository instructions, current handoff notes, and MakaLearn product skill. It records PECS-only choices, full-library randomization, semantic-conflict exclusions, no-text artwork, hidden answer labels, legacy-option sanitization, all affected renderers, and required regression checks.
- Files/areas: `AGENTS.md`, `CLAUDE.md`, `.codex/skills/makalearn-product/SKILL.md`.
- Verification: Documentation diff and `git diff --check` passed.

### 2026-09-25-activity-pecs-no-text-repair
- Outcome: Repaired the activity-option regression. New and previously saved rounds now discard gesture distractors, shared labels resolve to the PECS record, and every learner/teacher option surface uses the dedicated no-text activity artwork without a visible answer-label fallback.
- Files/areas: Shared activity value/image resolution, all Student and teacher option renderers, activity sample, focused tests, and current behavior notes.
- Verification: `npm run test:activities` (6 tests), `npx tsc --noEmit`, `npm run lint`, `npm run validate:materials`, `npm run build`, and `git diff --check` passed. The material validator's only warnings are the pre-existing duplicate PECS labels for Eat and Drink.

### 2026-09-25-choose-word-card-images
- Outcome: Choose the word now resolves each word answer to its learning material and shows the card image plus visible word in Student Mode and the teacher player. All active activity types now select and randomize image-backed PECS options, and the activity preview uses the same shared image resolver instead of displaying raw IDs or labels.
- Files/areas: Activity eligibility/question pools, Student and teacher option renderers, activity preview, current handoff notes.
- Verification: `npm run test:activities`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` passed. Automated browser verification was unavailable because both browser-control transports failed; the initially detected dev server exited before an HTTP check.

### 2026-09-25-full-library-activity-distractors
- Outcome: Corrected the randomized activity choices so wrong options rotate through the full eligible learning-material library first, rather than using the other answers selected for that activity. Other selected answers are only a fallback when the library is too small.
- Files/areas: `src/utils/activity-option-sets.ts`, `scripts/test-activity-option-sets.mjs`.
- Verification: `npm run test:activities`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` passed.

### 2026-09-25-choose-symbol-random-options
- Outcome: Activity choices now prioritize the cards selected for the activity, vary the distractor pair per question, randomize card order per round, and upgrade already-saved activities at play time. Applied to Choose correct symbol, Match word to symbol, Fill in the blank, and Choose the word; drag-and-drop already shuffles its selected-card tray.
- Files/areas: Shared activity option builder, activity question creation, teacher and Student Mode players, focused regression tests.
- Verification: `npm run test:activities`, `npx tsc --noEmit`, `npm run lint`, `npm run build`, and `git diff --check` passed.

### 2026-09-25-teacher-content-permissions
- Outcome: Made shared teaching content collaborative for teachers and view-only for admins; kept private lessons/activities owner-only; added teacher-specific activity-question overrides; removed learner-photo UI/data support; hardened account roles; repaired save cleanup and migration drift; and added missing foreign-key indexes. All migrations were applied and verified on the live Supabase project.
- Files/areas: Activities, Content Library, Admin content views, Learners photo removal, Supabase data/media helpers and types, schema/seed/storage definitions, and migrations.
- Verification: TypeScript, lint, production build, and `git diff --check` passed. Live RLS/policy, private-visibility, prompt-template, index, migration-history, and security-advisor checks passed. Supabase leaked-password protection remains unavailable because the project plan returned HTTP 402; the unused empty learner-photo bucket remains disabled and unreferenced because Storage forbids SQL bucket deletion.

### 2026-09-25-student-activity-instructions
- Outcome: Removed the top-left activity-type label from every Student Mode activity and introduced a shared, wider instruction banner with substantially larger responsive text for paged and drag-and-drop activities.
- Files/areas: `src/features/activities/player/player-parts.tsx`, `match-question.tsx`, `choose-question.tsx`, `drag-drop-question.tsx`.
- Verification: `npx tsc --noEmit` equivalent via the local compiler, `npm run lint`, `npm run build`, and `git diff --check` passed.

### 2026-09-22-admin-recent-activity-home
- Outcome: Replaced the Admin home Accounts card with Recent Activity, removed the lower dashboard cards below Usage Trends, and stopped loading activity results for the Admin home.
- Files/areas: `src/features/admin/overview-section.tsx`, `src/features/admin/admin-panel-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by local Next.js worker startup `spawn EPERM`.

### 2026-09-22-content-gesture-all-filter
- Outcome: The Content page now shows the category pill row for gestures when gesture categories exist, so the shared All button appears like it does for PECS cards.
- Files/areas: `src/features/content/materials-tab.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by local Next.js worker startup `spawn EPERM`.

### 2026-09-22-admin-content-buttons
- Outcome: Hid the Add PECS card/Add gesture material button on the Content page for admin users while keeping it visible for teachers.
- Files/areas: `src/features/content/content-library-view.tsx`, `src/features/content/materials-tab.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by local Next.js worker startup `spawn EPERM`.

### 2026-09-22-gesture-preload
- Outcome: Added idle-time authenticated preloading for gesture recognition assets: MediaPipe vision runtime, hand landmarker task, and MakaLearn CNN weights. Gesture Practice now reuses the shared cached hand tracker/model while camera startup remains page-only.
- Files/areas: `src/components/layout/app-shell.tsx`, `src/features/gesture/gesture-practice-view.tsx`, `src/utils/gesture-model.ts`, `src/utils/gesture-hand-tracker.ts`, `src/utils/gesture-preload.ts`.
- Verification: `npx tsc --noEmit`, `npm run lint`, `npm run test:feedback`, and `git diff --check` passed. `npm run test:gesture-capture`, `npm run test:gesture-stability`, and `npm run build` were blocked by local `spawn EPERM`.

### 2026-09-22-playground-search-hover-height
- Outcome: Removed the Playground search bar hover styling and aligned the search field and Categories label height with the category buttons.
- Files/areas: `src/features/playground/playground-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by Next.js worker startup `spawn EPERM`.

### 2026-09-22-playground-search-border
- Outcome: Added a subtle rounded blue border, white surface, and smooth focus shadow around the Playground search bar.
- Files/areas: `src/features/playground/playground-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by Next.js worker startup `spawn EPERM`.

### 2026-09-22-playground-search-same-row
- Outcome: Put the Playground search field in the same row as the Categories label, with category buttons and Mix up underneath in the same control block.
- Files/areas: `src/features/playground/playground-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by Next.js worker startup `spawn EPERM`.

### 2026-09-22-playground-search-position
- Outcome: Moved the Playground search field to the right side of the card controls and placed Mix up with the category buttons.
- Files/areas: `src/features/playground/playground-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by Next.js worker startup `spawn EPERM`.

### 2026-09-22-playground-content-search-match
- Outcome: Updated the Playground cards search to use the same shared search component and label-prefix filtering logic as the Content materials search.
- Files/areas: `src/features/playground/playground-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by Next.js worker startup `spawn EPERM`.

### 2026-09-22-playground-card-search
- Outcome: Added a search bar to the Playground cards section; it filters the visible PECS cards by label, category, or sentence role alongside the category filters.
- Files/areas: `src/features/playground/playground-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by Next.js worker startup `spawn EPERM`.

### 2026-09-22-activities-no-text-pecs-assets
- Outcome: Student Activities now use `public/pecs/generated_cards_no_text` artwork for visible PECS answer cards in Match, Choose, Drag and Drop, dropped previews, and result summaries while keeping prompt text and screen-reader labels.
- Files/areas: `src/features/activities/player/player-parts.tsx`, `match-question.tsx`, `choose-question.tsx`, `drag-drop-question.tsx`, `activity-result.tsx`.
- Verification: No missing manifest filenames in `public/pecs/generated_cards_no_text`; `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. `npm run build` was blocked by Next.js worker startup `spawn EPERM`.

### 2026-09-22-revert-pecs-no-text
- Outcome: Reverted the prior Activities PECS no-text card change. Student answer cards again render the full symbol artwork.
- Files/areas: `src/features/activities/player/player-parts.tsx`, `match-question.tsx`, `choose-question.tsx`.
- Verification: `git diff --check` passed.

### 2026-09-22-drink-gesture-label
- Outcome: Renamed the fixed gesture display phrase and spoken clip from I want to drink water to I want to drink, updated the live Supabase row and cache-safe audio URL, and retained the same gesture ID and trained model class/weights.
- Files/areas: gesture label/model mappings, gesture UI and feedback utilities, gesture tests, learning-media uploader/validator, README, seed data, `public/audio/gesture-drink-water.wav`.
- Verification: All gesture feedback/capture/stability tests, the seven-clip offline pronunciation audit, live material validation, `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. Build skipped because the user's Next.js dev server is running.

### 2026-09-22-learning-audio-pronunciation
- Outcome: Re-recorded Am as the spoken word and Hurt more clearly, published both under fresh Supabase Storage URLs, normalized Am in browser speech paths, and expanded live/local audio validation. All 57 bundled material recordings matched their intended labels in the final offline audit.
- Files/areas: `public/audio/pecs`, shared speech utilities, Content/Playground/Activity audio paths, learning-media uploader and validator, audio regression test.
- Verification: `npm run test:audio`, `npm run validate:materials`, `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. Build skipped because the user's Next.js dev server is running.

### 2026-09-21-guided-camera-brightness
- Outcome: Removed the full-frame dark gradient from guided capture and feedback while retaining the intentional countdown dimming and readable floating labels.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. Build skipped because the user's dev server is running.

### 2026-09-21-gesture-fixed-viewport
- Outcome: Made Student Mode gesture recognition a one-viewport, overflow-hidden shell in both regular and Focus Mode; camera, feedback, and reference regions now resize inside the available height instead of extending the page.
- Files/areas: `src/components/layout/app-shell.tsx`, `src/components/motion/page-transition.tsx`, `src/features/gesture/gesture-practice-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, `npm run test:gesture-stability`, and `git diff --check` passed. Build skipped because the user's dev server is running.

### 2026-09-21-corrective-feedback-visibility
- Outcome: Added a learner-facing high-visibility feedback treatment with larger instructions and teacher cues, strong correction/success borders, status icons, and readable sizing that remains large in Focus Mode.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`.
- Verification: `npx tsc --noEmit`, `npm run lint`, `npm run test:feedback`, and `git diff --check` passed. Build skipped because the user's dev server is running.

### 2026-09-21-hand-overlay-alignment
- Outcome: Matched the camera video and MediaPipe canvas to the same uncropped aspect-ratio fit in regular and Focus Mode, and requested a sharper 1280x720, 30 FPS user-facing stream.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`.
- Verification: Gesture capture, stability, and feedback tests, `npx tsc --noEmit`, `npm run lint`, and `git diff --check` passed. Build skipped because the user's dev server is running.

### 2026-09-21-phantom-hand-filter
- Outcome: Raised MediaPipe detection and presence confidence to 0.70 and tracking confidence to 0.65 to reject phantom background hands without changing gesture capture behavior.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`.
- Verification: Gesture capture and stability tests, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.

### 2026-09-21-first-gesture-followup
- Outcome: Made first-gesture detection more responsive with overlapping guarded candidate checks, kept candidate streaks through uncertain frames, isolated frozen A frames from B, added Sit Down/Help candidate disambiguation, and corrected mixed hand-count feedback.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`, `src/utils/gesture-capture-state.ts`, `src/utils/gesture-shape-safety.ts`, `src/utils/gesture-feedback.ts`, gesture tests.
- Verification: Gesture capture, stability, and feedback tests, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.

### 2026-09-21-first-gesture-wins
- Outcome: Added two-match background candidate tracking that freezes the first gesture when a repeated second gesture appears, preserves the existing completion rules and thresholds, and locks visible-hand consecutive attempts until confirmed no-hands reset.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`, `src/utils/gesture-capture-state.ts`, `scripts/test-gesture-capture-state.mjs`, `package.json`.
- Verification: Gesture capture, stability, and feedback tests, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.

### 2026-09-21-playground-card-drops
- Outcome: Prevented occupied-slot drops from firing twice, changed placed-card dragging to a true swap, and made library cards replace occupied positions.
- Files/areas: `src/features/playground/playground-view.tsx`, `src/utils/playground-board.ts`, `scripts/test-playground-board.mjs`, `package.json`.
- Verification: `npm run test:playground`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.

### 2026-09-21-playground-combination-audit
- Outcome: Expanded the Playground validator for addressed expressions, describing states, compact requests, semantic commands, and greeting-led sentences; added a complete 2,500-pair manifest audit plus targeted longer cases.
- Files/areas: `src/utils/pecs-sentence-validation.ts`, `scripts/test-pecs-sentence-validation.mjs`.
- Verification: `npm run test:playground`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.


### 2026-09-21-playground-grammar
- Outcome: Added strict subject and be-verb agreement, restricted base-form actions and requests to I/You, required Please for polite commands, blocked self-targeted Help, and added exhaustive regression coverage.
- Files/areas: `src/utils/pecs-sentence-validation.ts`, `scripts/test-pecs-sentence-validation.mjs`, `package.json`.
- Verification: `npm run test:playground`, `npx tsc --noEmit`, `npm run lint`, and `npm run build` passed.

### 2026-09-21-sit-down-gesture
- Outcome: Added a Sit Down guard that accepts the prediction only when the detected right hand is above the left hand. Verified with lint and a production build.
- Files/areas: `src/utils/gesture-shape-safety.ts`.

### 2026-09-21-playground-feedback
- Outcome: Classified valid boards as sentence, phrase, word, or expression; added a red remove button to each placed card. Verified in the live playground, TypeScript, lint, and validator examples.
- Files/areas: `src/utils/pecs-sentence-validation.ts`, `src/features/playground/playground-view.tsx`.

### 2026-09-21-session-board
- Outcome: Created this shared coordination file.
- Files/areas: `SESSION_BOARD.md`.
- Follow-up: Each new session should create and maintain its own active entry.
