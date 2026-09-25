# Session board

Use this file to coordinate work across terminal sessions in this repository. It records current work, not project requirements; `CLAUDE.md` and `AGENTS.md` remain the sources for project guidance.

## How to use it

1. At the start of a session, read this file and the project instructions. Check the active entries before changing files.
2. Add a brief entry under **Active sessions** before editing. Give it a unique ID (for example, a date, time, and short topic), your goal, and the files or areas you expect to touch. Use `TBD` if the files are not known yet.
3. Update only your own entry when the scope changes. Check this file again before editing an area another session lists. Coordinate with the user if the work would overlap.
4. When finished, move your entry to **Recently completed** with a short outcome and any follow-up. Keep recent history concise and remove old completed entries as it grows.
5. Do not put secrets, credentials, or personal learner data here. This file does not lock files or automatically synchronize separate worktrees; entries are a coordination signal.

## Active sessions

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
