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

### 2026-10-27-media-uploader-pr
- Outcome: Reviewed the uploader-only PR diff against main on jmlugue/fix-jordan-lee-upload. Includes the actual-name display, Jordan Lee fallback, matching search, and two focused regressions. No database migrations or record changes.
- Verification: Existing 21 media tests, TypeScript, clean lint, production build (23 pages), and whitespace checks passed. No source changes since those checks.

### 2026-10-27-media-uploader-fallback
- Outcome: Supersedes the fixed uploader display below. Media lists/details use available profile names and fall back to Jordan Lee only for missing/blank names. Paginated search includes matching named profiles and missing-profile uploads when the fallback matches. Stored ownership/access checks remain unchanged.
- Verification: 21 media tests including actual/missing-name and mocked paginated-query regressions, TypeScript, lint, production build (23 pages), React review, and whitespace checks passed. No live signed-in browser/database check, dev server, or database writes.

### 2026-10-27-media-uploader-name
- Outcome: Teacher/admin media lists and details now display Jordan Lee for every uploader using one temporary display constant. Media search matches the displayed name. Stored ownership/access checks are unchanged.
- Verification: 19 media tests, TypeScript, lint without warnings, production build (23 pages), and whitespace checks passed. React review completed. No dev server or database writes.

### 2026-10-27-playground-person-identity
- Outcome: Exactly I + am + one Family/People card is accepted without an article before cached/model grades and by the local fallback. Added the explicit Gemini exception, category/custom-card regressions, and current guidance. Updated the stale preparation-test mock for the existing claim flow.
- Hosted data: Corrected I am father/teacher/friend with three audit entries through supabase/maintenance/allow-playground-person-identities.sql. Verified all four built-in identities are valid and I am banana remains invalid.
- Verification: 53 Playground tests, instruction-copy check, TypeScript, lint, production build (23 pages), and whitespace checks passed. No live Gemini call, dev server, commit, or deployment.

### 2026-10-27-inactivity-hour
- Outcome: Changed the shared inactivity logout timeout from five minutes to one hour and updated its comment in `src/features/auth/use-auth-user.tsx`.
- Verification: Four auth tests, TypeScript, lint, production build (23 pages), and whitespace checks passed. Restored this worktree's dependencies with npm ci, preserving the lockfile. No dev server or deployment.

### 2026-10-27-media-pagination
- Outcome: Content Media fetches 24 file records per page for All/Images/Audio instead of preloading the complete library. Full-library search, filters, stable ordering, count-only badges, retryable failures, late-response guards, and last-page deletion recovery are included. Material file removal uses a bounded lookup. Explicit square thumbnail containers fix tablet collapse, with responsive filters and pagination controls.
- Files: Content view/Media tab, optional media omission in shared loader, Supabase media query helpers, five pagination regressions included in test:media, README/current-system notes.
- Verification: TypeScript, lint, production build (23 pages), 19 media tests, 7 reliability tests, 63 activity tests, and whitespace passed. Chromium/WebKit fixtures passed ten phone/tablet/desktop sizes, plus stale-response and deleted-page recovery. Visually checked tablet screenshots. Artifacts: system temp makalearn-media-pagination directory.
- Limits: Browser checks use sample records and query checks use mocked HTTP with the real Supabase client. No signed-in physical tablet or live Storage round trip, dev server, schema change, commit, or deployment.

### 2026-10-26-codebase-guide-pr
- Outcome: Added the thesis feature-to-code guide, README link, and simple explanatory comments in 24 source files. Aligned Playground documentation with the current AI-first checker and local MSAV fallback. Runtime behavior and database schema are unchanged.
- Scope: This PR excludes the separate AI implementation guide and concurrent reliability work.
- Verification: Fresh npm ci, TypeScript, lint, production build (23 pages), focused activity/Playground/gesture/feedback/auth/audio/media suites, 162 local links, and whitespace passed. All 24 source files compile identically with comments removed. Material validation lacks the required Supabase configuration. No live provider or hosted database write.

### 2026-10-26-app-instruction-copy
- Outcome: Audited app instruction strings and all four Gemini prompts. Removed visible semicolons and em dashes, simplified the upload and gesture cues, made the corrective feedback and activity punctuation rule explicit, and rejected generated wording that violates it through the existing fallback. Classification and grading rules are unchanged.
- Scope: Replaces PR #22 and includes its upload/style changes. Adds focused feedback/activity regressions, a source copy check, and docs/instruction-copy-audit.md. Concurrent reliability changes are excluded.

### 2026-10-26-material-category-audit
- Outcome: Reviewed all 67 hosted materials, added Polite Words/People/Health, and corrected 17 saved category assignments. Reused existing Grammar/Choices; retained reserved gestures, empty categories, and the ambiguous test material in No category. Updated corresponding built-in tags and 14 untouched generated descriptions, preserving the teacher-edited Sick description.
- Files: PECS manifest/types, library defaults, media importer, category colors, Playground category styles, maintenance SQL, category regression tests, targeted README/CLAUDE guidance, and docs/material-category-audit.md. Before/after data snapshots are Git-ignored under supabase/backups/.
- Verification: All 17 destinations and all 67 before/after records checked; existing categories and unrelated material fields preserved. Zero missing category/activity/collection references or duplicate category names. Three category regressions, 62 activity tests, 50 Playground tests, TypeScript, lint, build (23 pages), and whitespace passed. Full material validator attempted but unavailable without local Supabase URL/service-role credentials.
- Preservation: No activity option/renderer, role, grammar/preparation metadata, media URL, saved activity, collection, or shared index changes. No dev server, commit, push, or deployment.

### 2026-10-26-free-gesture-feedback
- Outcome: Free practice clears corrective feedback/loading at new capture start and on success; pending responses cannot restore an older correction. Holding the completed pose keeps feedback readable, and guided feedback behavior is preserved. Sit down accepts either hand on top without handedness labels, retaining two-hand consistency and vertical separation in candidate/final guards.
- Files: gesture-practice-view.tsx, gesture-shape-safety.ts, focused feedback tests and npm script, current CLAUDE guidance, and the AI guide's Sit down description. Preserved all pre-existing working edits and staged documentation.
- Verification: Feedback unit/mocked-route checks plus five lifecycle regressions, six capture tests, three stability tests, TypeScript, lint, production build (23 pages), and whitespace passed. New cases cover either hand order, unknown/reordered hand labels, invalid one-hand/level-hand input, late responses/fallbacks, and fresh wrong attempts. No dev server, live webcam/provider check, database writes, commit, or deployment.


### 2026-10-26-remove-caption-reminder
- Outcome: Removed the as-uploaded blank-caption checkbox, reminder panel, and acknowledgment-based Save restriction at the owner's request. The Add label to picture toggle, two previews, generation/error guards, and separate Activity upload behavior are unchanged. Updated targeted README/CLAUDE guidance.
- PR handling: Replaces the earlier checkbox-only PR #18 with the complete checkbox-and-reminder removal. No image-generation, Activity-renderer, database, audio, or existing-material changes.

### 2026-10-26-two-pecs-versions
- Outcome: Add material now defaults to adding the Label to new word-free PECS artwork and generates captioned Content plus word-free Activity PNGs through the existing file interface. Both previews appear on desktop/mobile. Fixed artwork/caption bounds, readable one/two-line captions, as-uploaded layout preservation with blank-area confirmation, current-request guards, neutral missing states, separate Activity upload for existing-word sources, and save retry feedback are implemented. Original uploads, existing saved-card replacement controls, filenames/limits, audio, gestures, database fields, and activity renderers are preserved.
- Files: card-form-dialog.tsx, pecs-card-template.ts, four additional media regressions, README.md, CLAUDE.md and own board entry. Pre-existing unrelated edits/index entries were retained.
- Verification: 14 media tests, all 62 activity tests (including PECS-over-gesture and no-text assets), TypeScript, lint, production build (23 pages), and whitespace passed. Chromium/WebKit passed eight viewport fixtures plus real-canvas checks for portrait/landscape/square/transparent artwork, existing frames, labelled sources, and long captions; checked delayed generation, corrupt images, confirmation resets, filenames/MIME, separate activity uploads, save failures/retry, and gesture preservation. Visually compared Eat, Good Morning, Thank You, and Wash Hands. Artifacts: system temp directory, makalearn-two-pecs.
- Limits: validate:materials was attempted but cannot run without NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Browser saving used a captured callback, not hosted uploads. No app dev server, database writes, commit, push, or deployment.

### 2026-10-26-playground-grammar-pr
- Outcome: Made AI grammar the default while retaining card roles and new-material role preparation for the MSAV fallback. Added the I am a friend prompt example and a role-based A/The person-description fallback, plus regression coverage and current configuration guidance.
- Supabase: Corrected only the existing english-v1 / i am a friend decision to valid sentence, with correction history and a Git-ignored backup. Verified the actual store reads the corrected result. No learning-item roles or schema changed.
- Verification: 50 Playground tests, 62 activity tests, TypeScript, lint, production build (23 pages), and whitespace passed. Hosted material validation retains three previously documented missing-material activity references and two Eat/Drink duplicate-label warnings. The owner reports hosted environment configuration is complete; fresh hosted AI behavior still needs a post-deployment smoke check.
- Scope: Only this Playground change and its own documentation/session notes are included. Existing staged documentation and unrelated working edits are preserved. No merge or deployment.

### 2026-10-25-login-placeholders
- Outcome: Updated login placeholders to Enter username and Enter password in `src/features/auth/login-panel.tsx`.
- Verification: Lint, production build (including TypeScript), and whitespace checks passed.

### 2026-10-25-playground-checker-pr-preparation
- Outcome: Prepared a focused 60-file patch on current main for strict-English Playground grading, permanent decisions, unchanged algorithm fallback with the earlier complement fixes, six grammar materials, dedicated artwork/recordings, and I pronunciation. Existing phone/tutorial work is retained from main without new changes.
- Verification: Fresh npm ci, 129 tests (46 Playground, 62 activity, 3 audio, 10 media, 4 tutorial, 4 auth), TypeScript, lint, production build (23 pages), and whitespace passed in an isolated checkout. Hosted material validation retains only the same three documented missing-material activity references and two duplicate-label warnings. Earlier SQL/browser fixtures and twenty live provider examples passed; one temporary provider failure passed on retry.
- Rollout: Both migrations and hosted grammar/audio assets are already applied. Vercel needs the dedicated Playground key, ai mode and configured model. Credentials and backups are excluded; shared working files and index are preserved.

### 2026-10-25-playground-ai-implementation
- Outcome: Implemented separate standard-English checker/provider/client adapter and Check/Listen integration with fixed local feedback, cancellation, permanent positive/negative Supabase decisions, leases, paid-request quotas, algorithm-only switch, temporary fallback, and an authenticated/audited admin correction endpoint. The existing validator is unchanged by this implementation; previous Sorry/person fixes remain. Added A/An/The/To/And/Not with explicit grammar metadata, twelve original PNG variants, six recordings, and corrected I recording/browser pronunciation. Preserved other sessions' source/layout work.
- Hosted: Applied migrations 20261025135800 and 20261025142300. Published six Grammar materials, labelled images, word-free media assets reserved for contextual activities, and i-pronoun-v2.wav; backups are Git-ignored under supabase/backups/playground-grammar. Generic activities and legacy grammar questions exclude these cards and Am/Is/Are at runtime; saved activities were not rewritten. Separate standard-image directory and unset Activity URLs prevent older clients from inferring generic eligibility.
- Verification: 46 Playground tests, 62 activity tests, 3 audio tests, 10 media tests, TypeScript, lint, production build (23 pages), and whitespace passed. Real service-role SQL assertions (rolled back) passed cache/lease expiry/retry, one reservation per claim, negative-grade reuse, audited corrections, quotas, and table/function/sequence privileges; no test grades remain. Supabase advisor has the existing leaked-password warning plus intentional service-only tables without client RLS policies. New standard images and all grammar audio passed live material checks; broad validation retains only the same three documented activities referencing deleted test cards and two duplicate-label warnings.
- Browser/audio: Chromium and WebKit fixtures passed eight viewport cases (390x664, 844x280, 768x1024, 1440x900): fixed success/retry feedback, grammar display, Listen reuse, pending disabling, stale response cancellation, and algorithm fallback. Fixtures used controlled grading responses, not live Gemini/authentication. Windows speech recognition identified replacement audio as I (confidence .925). Physical Safari voice/camera testing was not performed. Fixture artifacts are outside the repo under the system temp directory, makalearn-playground-implementation.
- Configuration: The owner added the dedicated key locally after implementation. All twenty live grading examples passed, including hot-water requests, polite requests, strict article checks, questions, and the new grammar words; one temporary provider failure passed on retry. No other Gemini key was reused. Vercel requires the dedicated key, ai mode, and the configured model on a deployment containing the new code. Docs/scripts cover provider verification, publishing assets, DB assertions, rollback switch, and admin corrections. No dev server or application deployment.

### 2026-10-25-playground-complements
- Outcome: Playground accepts I / Am / Sorry and You / Are / Teacher. Sorry and named-person cards (including custom named_person profiles) can complement a be-verb; AAC person descriptions allow omitted articles. Agreement, unrelated-complement exclusions, and existing addressed/standalone expressions remain covered. Updated CLAUDE guidance; existing message-classification work is preserved.
- Verification: Reproduced failing regression cases before the fix; all 30 Playground tests, TypeScript, lint, production build (21 pages), and whitespace passed afterward. No app dev server, browser validation, database writes, commit, push, or deployment.

### 2026-10-25-phone-status-flow-pr
- Outcome: Prepared jmlugue/phone-status-natural-scroll against main with only phone status CSS, STYLE_GUIDE, and own notes. Other sessions' changes and the shared branch/index are preserved.
- Verification: Exact source matches the isolated copy that passed lint and production build (21 pages with TypeScript checks). Chromium/WebKit passed 54 layout states, including unchanged tablet/desktop geometry. Whitespace passed; physical iPhone/live recognition confirmation remains pending.

### 2026-10-25-phone-status-flow
- Outcome: Phone learner status is full width below the toolbar and above camera/reference, with no sticky positioning or menu offset. It scrolls naturally with both previews. Strong border/icon and long-message wrapping remain. Updated STYLE_GUIDE; no component/recognition or other sessions' files changed.
- Verification: Chromium and WebKit passed 54 fixture states across six phone portrait/landscape sizes and three tablet/desktop sizes, covering neutral/success/long feedback, full-width alignment, initial toolbar/menu clearance, natural scroll displacement, Focus mode, and unchanged tablet/desktop grid geometry. The isolated gesture source copy passed lint and production build (21 pages with TypeScript checks). Whitespace passed. WebKit fixture readiness was changed from a fixed delay to an explicit ready wait after an initial fixture-only timing failure.
- Limits: Sample data and simulated camera/feedback, not physical iPhone or live recognition. Artifacts: D:/Downloads/makalearn-phone-status-flow. Changes are local; PR #12 was already merged. No dev server, commit, push, new PR, deployment, or production-data write.

### 2026-10-25-phone-guided-sizing-pr
- Outcome: Prepared jmlugue/fix-phone-guided-sizing against main with only gesture view, phone CSS, STYLE_GUIDE, and own session notes. Shared branch/index and other sessions' changes are preserved.
- Verification: These exact source files passed isolated TypeScript, lint, production build (21 pages), and four tutorial tests; Chromium/WebKit passed 82 layout states. Source matches the tested copy, and main's source tree equals the previously validated PR #11 base. Physical iPhone/live recognition confirmation remains pending.

### 2026-10-25-phone-guided-sizing
- Outcome: Reviewed all three images in D:/Downloads/revisions. Phone gesture status now reserves the fixed menu space while sticky, wraps long messages, and uses clearer borders/icons. Portrait camera/reference height grows with the viewport. Guided startup uses a compact short-landscape layout, and camera countdown text/circle scale to the actual preview, switching to side-by-side below 140px. Ready copy now says practice. Standard tablet/desktop layout and recognition behavior are preserved.
- Files/areas: src/features/gesture/gesture-practice-view.tsx, src/app/globals.css, STYLE_GUIDE.md, and own session notes. Other sessions' Playground work is untouched.
- Verification: Chromium and WebKit passed 82 fixture states across nine phone/tablet/desktop viewports, including both startup states without scrolling down to 568x240, sticky menu separation with long feedback, portrait camera height, and countdown bounds at five preview heights. Gesture capture/stability, feedback, four tutorial tests, and whitespace passed. The shared build encountered the other session's new playground-checker.ts token-narrowing error; an isolated copy of PR #11 plus exactly these three revision files passed TypeScript, lint, four tutorial tests, and the production build (21 pages).
- Limits: Browser checks use sample data and simulated camera/feedback, not physical iPhone Safari or live recognition. Artifacts are in D:/Downloads/makalearn-guided-sizing. No app development server, commit, push, PR update, deployment, or production-data write was performed.

### 2026-10-25-phone-followup-pr
- Outcome: Prepared an isolated PR on jmlugue/fix-phone-gesture-tutorials from current main, containing only the phone gesture/tutorial follow-up, small Playground remove-control styling, and this session's notes. Other sessions' pending Playground logic, tests, API/types, and documentation are excluded.
- Verification: Fresh npm ci, TypeScript, lint, production build (21 pages), 4 tutorial tests, 60 activity tests, 29 Playground tests, gesture capture/stability and feedback checks passed on the isolated PR tree. Existing Chromium/WebKit fixtures exercise identical owned source files. Physical iPhone camera and hosted video checks remain pending.

### 2026-10-25-phone-followup
- Outcome: Implemented the approved second-recording plan. Phones have a stable camera beside a reserved/enlargeable reference, progress below the preview, sticky learner status, and full learner/teacher feedback below. The guided journey follows feedback. Reference pictures remain visible until animation playback starts and after errors, with a manual play action. Help/intro tutorials honor app and system reduced motion, offer explicit Play demo, and stop auto-skipping still steps. Short dialogs fit or scroll safely. Playground shows a 20px remove circle/12px X inside a 44px phone tap target. Tablet/desktop layout rules and recognition/scoring logic are preserved.
- Files/areas: Phone CSS, gesture view/motion media, Help demo, Student activity intro, Playground remove class, STYLE_GUIDE, and npm test:tutorials with four component-clock regression tests. Other sessions' Playground validators, source, tests, and docs were left intact.
- Verification: TypeScript, lint, production build (21 pages), 4 tutorial tests, 60 activity tests, 30 Playground tests, gesture capture/stability and feedback checks, and whitespace passed. Chromium and WebKit passed 70 component/viewport checks across 390x664, 844x280, 667x270, 375x600, 768x1024, 1024x768, and 1440x900. Additional checks covered actual tutorial transform changes under normal/system/app motion settings, stable camera geometry while feedback loads, sticky status, guided layout separation, reference enlargement, and touch removal.
- Limits: Browser fixtures used local sample data and simulated camera/feedback state. Chromium decoded the synthetic reference video and passed autoplay-refusal/retry/error checks; the local WebKit test video never became ready, and its still-picture fallback was verified instead. Physical iPhone Safari, hosted media playback, and live recognition still need confirmation. Artifacts are outside the repo in D:/Downloads/makalearn-phone-followup. No app dev server, database write, commit, push, or deployment was performed.

### 2026-10-25-playground-pr-base-merge
- Outcome: Merged origin/main (3b046a8) into PR #10's jmlugue/playground-feedback-pr branch. Resolved the sole conflict in SESSION_BOARD.md by preserving both branches' completion notes. Incoming iPhone layouts and interactions are retained alongside the PR's Playground word/phrase/sentence feedback.
- Verification: 29 Playground tests, 60 activity tests (including PECS-over-gesture resolution and all bundled no-text assets), 6 gesture capture tests, 3 gesture stability tests, feedback checks, TypeScript, lint, production build (21 pages), and whitespace passed. Material validation could not run without NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. No dev server was started. Merge completed locally; no push performed.

### 2026-10-25-playground-feedback-pr
- Outcome: Prepared a separate branch from origin/main containing only this agent's eight Playground feedback source/test/docs files and own session notes. The source worktree's responsive changes remain untouched.
- Verification: Fresh npm ci, all 29 Playground tests, TypeScript, lint, production build (21 pages), and whitespace passed in the isolated checkout. No dependency or lockfile changes. Material-validation and live-Gemini limits remain as documented below.

### 2026-10-25-playground-message-types
- Outcome: Standalone words (including Listen/Help) now say "You made a word"; bundled multi-word labels say "You made a phrase". New Gemini preparations require a validated singleCardType in the existing JSON profile so complete multi-word statements/questions can receive sentence feedback. Older profiles remain compatible; Am/Is/Are and multi-card acceptance are unchanged. No migration or saved-record changes.
- Audit: Read all 62 hosted materials (55 PECS, seven gestures). Ran all 55 PECS records through the current standalone rules: 48 word results, three phrase results, three incomplete be-verbs, and one unsupported material excluded. The 50-card manifest is covered exhaustively in the regression suite. Gesture materials remain outside Playground.
- Verification: 29 Playground tests, including the actual preparation route with isolated provider/database stubs, TypeScript, lint, production build (21 pages), and whitespace passed. Full material-validation CLI could not run without local Supabase credentials; the focused live audit used the connected database. No live Gemini request, browser check, dev server, or deployment. Responsive-session files were left untouched.
### 2026-10-25-iphone-layout-pr
- Outcome: Prepared a separate PR on jmlugue/iphone-browser-hosted-ui containing only the iPhone layout, activity input, gesture feedback, Playground layout, Help demo, and style guidance changes. The other session's message-classification implementation, tests, and docs are excluded.
- Verification: Source changes match the tested local files; TypeScript, lint, build, focused suites, and browser fixture checks passed. Material validation remains unavailable without local Supabase configuration; physical iPhone confirmation remains pending.

### 2026-10-25-iphone-walkthrough
- Outcome: Reviewed the supplied iPhone recording and added phone-only portrait/landscape layouts. Student drag activities support persistent tap-picture/tap-word selection; teacher touch selections survive scrolling. Short landscape activities fit targets and pictures together, with choice prompts beside the options. Gesture practice keeps learner feedback visible, overlays hold progress on the camera, shrinks Maki, and fits success popups in landscape. Playground pins the board and controls while its card picker scrolls independently. Help demos resize without waiting for scene exits and have explicit Pause/Play controls.
- Files/areas: Activity renderers and frames, gesture and Playground layouts, Help demo, phone-layout hook, globals.css, STYLE_GUIDE. Option generation, scoring, recognition, and Playground validation logic are unchanged by this session. The separate message-classification session's changes are preserved.
- Verification: TypeScript, lint, production build (21 pages), 60 activity tests, 29 Playground tests (including the other session's additions), gesture capture/stability and feedback checks, and whitespace passed. Browser fixtures passed 56 component/viewport cases at 390x664, 844x280, 844x390, 667x270, 768x1024, 1024x768, and 1440x900. Additional checks covered teacher touch selection/placement at five sizes, desktop mouse dragging, and gesture layout rotation both ways. Screenshots and fixture scripts are outside the repo in D:/Downloads/makalearn-video-review.
- Limits: Material validation could not run without NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. Browser fixtures used local sample data and simulated feedback/camera state, not live recognition or authenticated backend calls. Physical iPhone Safari needs confirmation after deployment. No app dev server, commit, push, or deployment was performed.

### 2026-10-25-responsive-stash-pull-commit
- Outcome: Stashed all responsive changes, fetched origin, fast-forwarded this branch to main's PR #7 merge commit 93213e8, and restored all nine changed files without conflicts for the local responsive-fix commit. No push performed.
- Verification: Incoming merge commit has the identical file tree as the prior HEAD; restored application files exactly match the stash. Prior passing build/lint/TypeScript and browser checks remain applicable; whitespace check passed.

### 2026-10-25-device-layout-fixes
- Outcome: Fixed supplied phone landscape clipping with scrollable Student activity/Playground stages and navigation; portrait tablet gesture practice reserves a taller camera and places feedback before reference cards. Content tiles reserve image height with a Safari-compatible ratio fallback and align gesture names. Desktop stages remain fitted. Guided thumbs-up logic is unchanged; models are served to each browser and the manual ready button remains available.
- Files/areas: Content tiles, Student shell/drawer, gesture and activity frames, Playground layout, globals.css, STYLE_GUIDE/CLAUDE.
- Verification: TypeScript, lint, activity/Playground/gesture capture/stability tests, production build, and browser component/layout fixtures at 390, 768, 844, 1024, and 1440px widths. Tested short-screen scrolling, drawer Exit reachability, portrait feedback separation, guided row width, desktop overflow, and picture sizing without aspect-ratio. Physical Safari and live camera detection remain unverified; no dev server was started or deployment performed.
- Existing data issue: Material validation reports three saved activities referencing missing materials (activity-1792416404084, activity-1792459136377, activity-1792459294548); records were left unchanged. Existing Eat/Drink duplicate-label warnings remain.

### 2026-10-25-pr7-base-merge
- Outcome: Merged origin/main (64479a1) into PR #7's jmlugue/fix-mobile-tablet-responsive branch. Resolved the sole conflict in SESSION_BOARD.md by preserving both branches' completion notes. Content upload templates, free-gesture feedback, and Playground speech cancellation are retained.
- Verification: TypeScript, lint, 10 media tests, 24 Playground tests, 6 gesture capture tests, 3 gesture stability tests, feedback checks, production build (21 pages), and whitespace passed. No dev server was started. Merge completed locally; no push performed.

### 2026-10-25-playground-speech-cancel
- Outcome: Playground board edits, Clear, newer Check/Listen actions, and unmount invalidate stale narration callbacks. Removing cards cancels active browser speech and prevents the post-Maki readout or remaining Listen sequence from reading the old board.
- Files/areas: Playground view and four handler-level speech regression tests. Activity behavior is unchanged.
- Verification: All 24 Playground tests, TypeScript, lint, production build, and whitespace checks passed. No dev server was started; physical browser voice timing was not exercised.

### 2026-10-25-dependency-readiness
- Outcome: Full npm dependency tree is valid; package declarations, lockfile, and installed required versions agree. No dependency changes or reinstall needed. Registry check found newer releases; npm audit reported 12 advisories (1 critical, 9 high, 2 moderate), including Next.js; major upgrades were not applied.
- Verification: TypeScript, lint, production build, and all eight local test commands passed. Supabase CLI runs. Material validation is blocked by absent Supabase configuration; this worktree has no .env.local and required values are absent from the shell. No dev server was started.
- Follow-up: Configure .env.local from .env.example using the existing project credentials before signed-in/backend use. Plan dependency/security upgrades separately.
### 2026-10-25-pr6-base-merge
- Outcome: Merged origin/main into jmlugue/fix-free-mode-mobile for PR #6. Resolved the sole conflict in SESSION_BOARD.md by preserving both branches' completion notes. Base content-upload changes and the PR's free-gesture feedback fix are retained.
- Verification: 10 media tests, 6 gesture capture tests, 3 gesture stability tests, TypeScript, lint, production build (21 pages), and whitespace checks passed. Development server was stopped for the build and remains stopped. Merge completed locally; no push performed.

### 2026-10-25-branch-reference-repair
- Outcome: Reattached this worktree's stale unborn `jmlugue/ruffe` HEAD to the existing renamed `jmlugue/fix-free-mode-mobile` branch at `7fea443`. Preserved all working files and index entries; saved a backup patch in the system temporary directory.
- Verification: Git now shows only three modified files (gesture view, AGENTS, session board), no staged additions, and the existing commit history. No commit or push was made.

### 2026-10-25-dependency-guidance
- Outcome: Added worktree dependency rules to `AGENTS.md`: use `npm ci` for setup and repairs, keep installations separate, preserve/share the lockfile, stop dev before reinstalling, and verify TypeScript, lint, and build after repairs.
- Verification: Documentation-only change; whitespace check passed.

### 2026-10-25-full-dependency-repair
- Outcome: Stopped only this worktree's running Next.js dev processes and replaced its incomplete dependency tree with `npm ci` (479 packages). The previously missing Lucide icon exists and native SWC loads. No source, manifest, or lockfile changes were needed.
- Verification: TypeScript, lint, and full production build passed; all 21 pages generated. Dev server remains stopped for the owner to restart manually.

### 2026-10-25-swc-repair
- Outcome: Restored the damaged Windows x64 SWC package at the locked 14.2.33 version, verifying the downloaded archive against the lockfile SHA-512 integrity. Manifest and lockfile are unchanged.
- Verification: Native module loads, and Next.js SWC successfully compiles a TypeScript/JSX sample. Development server was not started.

### 2026-10-25-next-launcher
- Outcome: Restored the damaged local Next.js 14.2.35 package from its registry archive after verifying the lockfile SHA-512 integrity, then regenerated its Windows launcher. Package manifest and lockfile are unchanged.
- Verification: `npm run dev -- --help` passes. Development server was not started.

### 2026-10-25-free-gesture-feedback
- Outcome: Free-practice feedback now remains visible while the next pose is being captured and is replaced when that attempt is evaluated. Camera restart/stop still clears stale feedback; guided behavior is unchanged.
- Files/areas: `src/features/gesture/gesture-practice-view.tsx`.
- Verification: `git diff --check` passed. No build or lint run.

### 2026-10-25-local-sign-in-config
- Outcome: Restored missing Git-ignored `.env.local` in batfish from the original checkout's existing local configuration. Missing Supabase browser settings caused the administrator-setup message; no account or auth code changes were needed.
- Verification: Next.js environment loader sees the URL and browser key, Supabase Auth settings endpoint responds HTTP 200, and Git confirms the file is ignored. No secret values displayed. User must restart their dev server to reload public configuration; no server was started automatically.

### 2026-10-25-card-template-choice
- Outcome: Supersedes the display-only frame below. Add material defaults to a 900Ãƒâ€”1200 PECS template matching bundled outline geometry, with an explicit Use image as uploaded option for pre-framed pictures. Canvas fits the complete image proportionally inside the border without extra padding. The exact preview PNG is saved so Content and Playground agree; original files remain available while switching styles. Mobile now shows the preview. Activity pictures and gestures are unchanged; shared renderers add no border.
- Files/areas: Card form, new `pecs-card-template.ts`, media test command/fitting test, README/CLAUDE.
- Verification: TypeScript, lint, 10 media tests, production build, whitespace, and actual Chrome canvas pixel/format/error checks passed. Visually inspected a comparison using the supplied screenshot. Build reported ENOSPC cache warnings but exited successfully; automatic review blocked cache cleanup and no cleanup occurred. No deployment or database writes performed.

### 2026-10-25-content-card-outline
- Outcome: Uploaded PECS pictures receive a rounded black display frame in the Content material grid, live upload preview, material details, and collection picker/preview. Known bundled/local and migrated artwork keeps its baked-in outline; gesture references and stored files are unchanged. Updated the upload hint.
- Files/areas: Content `PictureBox`, card tile/form/detail, and collection form/preview.
- Verification: TypeScript, lint, production build, and whitespace passed. Render checks passed for uploads, blob previews, replaced built-in artwork, original local/hosted assets, gesture references, empty values, and malformed URLs. No browser visual verification or deployment performed.

### 2026-10-21-remove-account-requests
- Outcome: Removed the public request page/form, submission and approval/rejection APIs, hidden admin UI/dialogs/polling, adapters/types, obsolete test command/suite, and schema/audit script references. Direct admin account creation remains; historical audit log formatting and applied migration history remain readable. Updated README/CLAUDE and readiness history.
- Database: Applied hosted/local migration `20261020201558_remove_account_requests`; backed up the four reviewed requests (zero pending) under Git-ignored `supabase/backups/account-requests-retirement.json`, then dropped the request table and status enum without CASCADE. Verified both absent. Existing users/profiles and audit logs are preserved.
- Verification: Four auth tests, TypeScript, lint, production build, and whitespace passed. Build route output confirms request routes are absent. Restored declared local dependencies without changing package versions/lockfile. Security advisor retains only the existing leaked-password-protection warning.
- Follow-up: Application deployment is pending; older deployed admin bundles still query the retired table until updated. No commit/push/deployment was made.

### 2026-10-17-supabase-readiness
- Outcome: Audited hosted usage and applied owner-approved cleanup: removed the two unused seeded learners, learner/practice tables and dormant code, five enum types, two unreferenced retired activities plus ten questions, thirteen obsolete AI generations, eleven unused Storage files, the empty learner-photo bucket, and six unused/redundant result columns. Active materials, collections, Student Mode results, prompt templates, and quota history are preserved. Recovery snapshots/files are Git-ignored under `supabase/backups/`.
- Collection compatibility: Added security-invoker `collections`/`collection_items` APIs, renamed `collection_source`, and added an invoker/RLS-protected upsert helper. Updated app adapters, new IDs, audit names, links, validators, and docs. Legacy lesson backing tables and empty learner/practice views remain for older deployed clients. No commit or application deployment was made; physical backing-table renaming awaits retirement of old writes.
- Verification: All 24 local/hosted migrations match (`db push --dry-run` is up to date); 60 activity tests, TypeScript, lint, live material validation, production build, and whitespace passed. Real adapter HTTP reads and anonymous denial passed; three password-based HTTP tests explicitly skipped without TEST credentials. Transaction-rolled-back SQL checks passed teacher Collection CRUD/reorder, legacy writes, Student Mode result persistence, teacher isolation, admin read-only behavior, and anonymous denial. No test rows remain.
- Remaining: Existing leaked-password-protection warning, six informational unused-index notices, unverified fresh-project bootstrap, and a separate least-privilege grants review. See `docs/supabase-readiness-audit.md`. Automatic review rejected the initial broad cleanup; narrower dependency-guarded migrations were then accepted and applied.

### 2026-10-12-playground-readiness-feedback
- Outcome: Made new-material readiness truthful and purpose-specific. Playground requires a public card picture plus prepared MSAV, with audio explicitly optional. Activities now have a separate word-free `activity_image_url`; teacher-created cards without it are excluded from creation, AI drafting, option pools, and playback, and visible options never fall back to labelled card art. Playground now uses saved Supabase categories and one shared browser voice for every card.
- Files/areas: Content create/detail/media UI, Playground category/narration mapping, shared activity-artwork eligibility and rendering, Supabase mappings/types/schema, hosted migration `20261012021919_add_activity_images.sql`, focused tests/validator, README/CLAUDE, and this session board. Distractor semantics, scoring, and gestures were unchanged.
- Verification: Hosted column and enum value verified; activity tests (60), Playground tests (20), TypeScript, lint, live material validation, production build, and patch whitespace passed. Material validation retains only the existing Eat/Drink duplicate-label warnings. Supabase advisors retain the existing leaked-password-protection warning and informational unused-index notices.

### 2026-10-09-msav-new-material-preparation
- Outcome: Added one-time, server-side Gemini preparation for new non-manifest PECS materials, manual teacher retry with a 60-second cooldown, validated persisted MSAV profiles, and Playground filtering for pending/unsupported cards. Existing manifest cards keep their fixed rules, bypass Gemini, and remain visible. No automatic retries were added.
- Files/areas: MSAV profile/rules/tests, preparation API, Content creation/detail UI, Playground picker, learning-item types/data mapping, environment/docs, hosted migration `20261009000000_msav_new_material_preparation.sql`, and this session board.
- Verification: Hosted database has all six new columns and 0/59 existing materials have an AI status or profile. Playground/MSAV tests (17), activity tests (58), TypeScript, lint, material validation, production build, patch whitespace, and Supabase advisors passed. Material validation retains only the existing Eat/Drink duplicate-label warnings; advisors retain only the existing leaked-password-protection warning. No live Gemini request was made because `GEMINI_MSAV_API_KEY` is not configured.

### 2026-10-05-msav-deterministic-wording
- Outcome: Clarified the `How MSAV decides` row to state that MSAV uses fixed rules and that the same exact cards in the same order always receive the same result.
- Files/areas: Updated `output/thesis/Phase 2c MSAV Results and Discussion.docx`; no application behavior or data changed.
- Verification: Google Docs title sanitizer passed. Microsoft Word rendered the document to three pages; all pages were visually inspected and the revised table row remained fully visible with no clipping, overlap, or pagination changes.

### 2026-10-05-msav-message-types-row
- Outcome: Replaced the unclear `Ways the cards can be arranged` row with `Types of messages MSAV can check` and a concise explanation listing the 14 message types as one-card messages, requests, action sentences, descriptions, greetings, and commands.
- Files/areas: Updated `output/thesis/Phase 2c MSAV Results and Discussion.docx`; no application behavior or data changed.
- Verification: Google Docs title sanitizer passed. Microsoft Word rendered the document to three pages; all pages were visually inspected and the revised row remained readable without clipping, overlap, or pagination changes.

### 2026-10-05-msav-plain-language-flow
- Outcome: Revised the user-selected Phase 2c document by replacing `card job` with `card type`, replacing `recognized message patterns` with `ways the cards can be arranged`, and simplifying related explanations. Rebuilt the MSAV validation-flow figure with centered steps, separate branch arrows, and equal valid/invalid outcome boxes.
- Files/areas: Updated `output/thesis/Phase 2c MSAV Results and Discussion.docx` from the user-selected Downloads copy; no application behavior or data changed.
- Verification: Google Docs title sanitizer passed. Microsoft Word rendered the final file to three pages; every page was visually inspected, and the revised diagram and all tables were fully visible with no clipping, overlap, or alignment defects.

### 2026-10-05-msav-word-simplification
- Outcome: Simplified the MSAV scope explanations by describing sentence roles as card jobs, construction types as recognized message patterns, and the decision method as fixed local rule checking. Removed the `Food + Is + Hot` representative validation row and the future-versions paragraph under New Learning Materials.
- Files/areas: Updated `output/thesis/Phase 2c MSAV Results and Discussion.docx`; no application behavior or data changed.
- Verification: Google Docs title sanitizer passed. Microsoft Word rendered the revised DOCX to four pages; all pages were visually inspected, the flow figure and tables remained fully visible, and no clipping, overlap, or broken layout was found.

### 2026-10-05-msav-word-document
- Outcome: Created a concise four-page black-and-white Word version of the Phase 2c MSAV Results and Discussion section. It includes the final scope, fully visible validation-flow figure, representative rules and cases, 13/13 test evidence, system integration, new-material limitations, and an evidence-based readiness discussion.
- Files/areas: Added `output/thesis/Phase 2c MSAV Results and Discussion.docx`; no application behavior or database state changed.
- Verification: Google Docs title sanitizer passed. Microsoft Word rendered the final Letter-size DOCX to four pages; every page was visually inspected, all tables were readable, the flow figure remained together on one page, and no content was clipped or overlapped.

### 2026-10-05-msav-results-writeup
- Outcome: Drafted an evidence-backed Phase 2c Results and Discussion section from the thesis methodology, current MSAV/Playground implementation, automated tests, and Git history. The draft documents the 50-card role inventory, final functional rule set, development sequence, 13/13 passing test groups, representative cases, integration behavior, limitations, and the mismatch between three proposed BSR examples and the final code.
- Files/areas: Added `output/thesis/phase-2c-msav-results-and-discussion-draft.md`; source PDF, MSAV/Playground code, tests, and Git history were read-only. No application behavior or database state changed.
- Verification: `npm run test:playground` passed all 13 named tests, including the exhaustive 2,500 ordered two-card audit; representative current outputs were reproduced directly from the validator; `git diff --check` passed apart from the repository's existing PowerShell LF-to-CRLF notice for the session board.

### 2026-10-04-vercel-production
- Outcome: Deployed GitHub `main` commit `39668a1` to Vercel production at `https://makalearn.vercel.app` as project `maka-learn/makalearn`. Configured Node.js 22, Mumbai functions (`bom1`), GitHub `main` production tracking, and the seven approved Production/Preview variables; Supabase's temporary password was not uploaded. Updated Supabase Auth Site URL and kept production plus localhost redirect patterns.
- Files/areas: Repaired `package-lock.json` clean-install metadata and aligned `scripts/test-account-requests.mjs` with the intentionally hidden login link; Vercel project/settings/environment variables, Supabase Auth URL configuration, and this session board. No database schema or application behavior changed.
- Verification: Clean npm 10 install, all non-live suites, TypeScript, lint, live material validation, production build, and tracked-secret scan passed. Vercel build is Ready from commit `39668a1` with functions in `bom1`; teacher/admin sign-in and role redirects, Supabase content/images/audio, teacher and Student Mode activity scoring, Playground, admin views, temporary content/media upload/update/delete cleanup, hosted activity-draft fallback, hosted gesture feedback, and all deployed MediaPipe/model assets passed. Vercel runtime error/warning/5xx scans were clean. The automation browser exposed no playable webcam feed, so live hand recognition could not be physically exercised; HTTPS camera activation and asset loading were verified.

### 2026-10-03-invalid-activity-option
- Outcome: Repaired the hosted Father match question after its saved distractor referenced the deleted teacher-created PECS card `try`. Replaced only that stale option with the eligible image-backed PECS `Read` card; the Father answer, prompt, activity selection, and scoring were unchanged.
- Files/areas: Hosted `activity_items` row and this session board. No application code or schema changed.
- Verification: `npm run validate:materials` passed with zero errors (only the existing Eat/Drink duplicate-label warnings); `npm run test:activities` passed 58 tests; TypeScript, lint, and production build passed.

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
