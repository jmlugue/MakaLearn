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
