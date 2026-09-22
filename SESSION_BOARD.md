# Session board

Use this file to coordinate work across terminal sessions in this repository. It records current work, not project requirements; `CLAUDE.md` and `AGENTS.md` remain the sources for project guidance.

## How to use it

1. At the start of a session, read this file and the project instructions. Check the active entries before changing files.
2. Add a brief entry under **Active sessions** before editing. Give it a unique ID (for example, a date, time, and short topic), your goal, and the files or areas you expect to touch. Use `TBD` if the files are not known yet.
3. Update only your own entry when the scope changes. Check this file again before editing an area another session lists. Coordinate with the user if the work would overlap.
4. When finished, move your entry to **Recently completed** with a short outcome and any follow-up. Keep recent history concise and remove old completed entries as it grows.
5. Do not put secrets, credentials, or personal learner data here. This file does not lock files or automatically synchronize separate worktrees; entries are a coordination signal.

## Active sessions

<!-- Add one section per session. Example:
### 2026-09-21-1430-content-library
- Status: active
- Goal: Add category filtering to the content library.
- Files/areas: `src/app/...`, `src/components/...`
- Notes: None.
-->

## Recently completed

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
