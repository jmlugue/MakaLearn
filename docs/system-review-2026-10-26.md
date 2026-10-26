# MakaLearn system review — 26 October 2026

The original review was read-only. The findings below describe the working tree at that time. The implementation update records the subsequently authorized changes and verification. Neither section establishes that the deployed application has identical code.

## Owner decisions and remaining discussion (26 October)

Implementation was authorized after the follow-up discussion. See [the current system reference](current-system.md) for the implemented scope and post-defense backlog. All UI changes must fit the existing MakaLearn design and components, with brief, direct copy.

- **01: Deferred task, after the defense on Wednesday 28 October 2026.** Earliest planned work is Thursday 29 October. Review dependency advisories, select compatible updates, preserve existing behavior, and verify the proposed release. This is a backlog entry, not a scheduled reminder or automatic update.
- **02: Accepted.** Require an active signed-in account at the feedback endpoint and allow 200 paid gesture-feedback requests per rolling hour per account. Preserve recognition and normal feedback behavior; use the existing local feedback after the allowance is reached. Count provider attempts; no additional daily cap requested. Enforce limits on the server, including simultaneous requests and multiple devices.
- **03: Accepted.** Block duplicate labels within the same material type on create/rename, ignoring case and redundant spaces. PECS and Gesture may share a label. Review existing duplicates separately without automatic deletion.
- **04-05: Accepted.** Persistent truthful loading errors with Retry, and accurate/recoverable partial media-deletion outcomes.
- **06: Accepted with the finalized implementation scope.** Explain current consequences: collection links and activity questions can be removed while parent records remain. Accepted policy: remove the material and affected references, retain all other cards/questions and parent records, but block deletion if it would leave a collection/activity empty. Explain impacts in the existing confirmation UI.
- **07-08: Accepted.** Correct Help's explanation of saved results and shorten Add material guidance without weakening the no-text Activity picture requirement.
- **09: Clarified.** Outside Student Mode the teacher uses Preview; inside Student Mode the learner uses Play. This intended distinction must remain. Other agreed wording refinements concern email entry, reading-aloud status, and closing a finished guided summary.
- **10: Accepted with wording revision.** Proposed concise text: "New gesture materials are saved in Content. Gesture recognition supports only the seven built-in signs." No repeated or intrusive banner.
- **11 and 15: Excluded.** No standalone keyboard-overlay or admin-history-search project in this implementation batch.
- **12-13: Accepted.** Protect unfinished forms and improve save reliability without changing the effects or normal behavior of settings.
- **14: Accepted with strict request controls.** Recover abandoned preparation work only on an explicit teacher retry. No automatic polling, repeated provider calls, or background retries. Only one live preparation per material; enforce retry cooldown and server request limits before any paid call. Reclaiming stale work must not itself contact the provider. Accepted preparation budget: 10 provider attempts/hour and 40/day per teacher, with at least 60 seconds between attempts on the same material. This is separate from the accepted 200/hour gesture-feedback allowance. Failed provider attempts count; local/no-provider responses do not.
- **16: Accepted in the earlier discussion and retained.** Improve notification reading time and recovery guidance using the current notification design.
- **17-18: Accepted.** Narrow data loading while preserving full eligible PECS activity choices; consolidate current documentation and clearly mark history.
- **19: Deferred with 01 until after the defense.** New bootstrap/CI work waits; existing tests, lint, TypeScript, and build remain required for implemented changes.
- **20: Later.** Complete signed-in/device/storage/provider acceptance checks after the chosen changes are implemented. This does not defer the existing required tests/build checks during implementation.

## Implementation update (26 October)

Implemented **02-10, 12-14, and 16-18** in the shared working tree, retaining the current design and activity option rules. Dependency manifests are unchanged from the implementation baseline. **01/19 remain deferred, 11/15 remain excluded, and 20 remains the separate live acceptance pass.**

- Gesture feedback now verifies an active teacher/admin account and reserves provider attempts atomically before calling the provider. The service-only ledger allows 200 attempts per rolling hour per verified account. Anonymous/inactive requests cannot reach the provider, client-supplied account IDs cannot change quota ownership, and quota/provider failures preserve local feedback.
- Preparation uses explicit retries, expiring claims, version-checked completion, a same-material cooldown, and 10/hour plus 40/rolling-day limits. No polling or provider retry loop was added.
- Added duplicate-label and last-card deletion guards, retryable partial media cleanup, persistent load failures, discard confirmations, atomic partial settings saves, narrower paged loaders, shorter copy, and readable notifications. Current behavior is consolidated in [current-system.md](current-system.md).
- Applied [20261026065201_review_reliability_guards.sql](../supabase/migrations/20261026065201_review_reliability_guards.sql) to the connected hosted Supabase project. Rolled-back SQL fixtures passed for permissions, quota boundaries, duplicate labels, deletion repair/last-item protection including hidden private dependencies, preparation claims, and independent settings patches. Concurrent service-role requests at the 199-attempt boundary produced one allowed request and one denial. Another account retained its allowance. Temporary fixtures were removed and checked absent.
- Local suites passed: 63 Activities, 50 Playground, 4 auth, 14 media, 3 audio, 4 tutorials, 5 feedback lifecycle, 6 capture, 3 gesture stability, 7 review reliability, 3 category, and 1 instruction-copy tests. Existing feedback unit/mocked-route assertions also passed. TypeScript, lint, production build (23 pages), and whitespace checks passed.
- Chromium and WebKit component fixtures passed at phone, tablet, and desktop widths. They cover duplicate validation, paired artwork/save callbacks, discard protection, retryable loading, queued settings failure/rollback, and readable notifications. Phone/desktop checks also cover edit protection and dependency deletion confirmations. Reviewed screenshots and corrected a clipped phone Voice control. These fixtures use mocked adapters and do not constitute signed-in app acceptance.
- Hosted checks found no dangling activity-material array references or retained test data. Database advisors reported no new warnings. The new private quota table intentionally has RLS with no browser policies. Dependency upgrades and the existing leaked-password protection advisory remain outside this batch.

The application changes are **not deployed**. No app development server, paid live provider calls, webcam session, or real media upload/deletion was used for this implementation. `npm run validate:materials` remains unavailable without local Supabase URL/service-role configuration. Full signed-in/device/Storage/provider acceptance remains pending under **20**.

## Original review assessment

The main journey makes sense: teachers build materials and collections, make PECS activities, and enter Student mode for Playground, gesture practice, or games. The local checks pass. The largest improvements are failure recovery, a few misleading explanations, and reducing the amount of guidance shown during routine tasks. A visual redesign or restoration of retired Learners/Progress pages is not needed to address these findings.

### Evidence and limits

- Reviewed route structure, landing/login, navigation and Student mode, Content and its forms/media/collections/categories, Activities creation/playback/scoring/options, Playground checking/speech, gesture capture/feedback, admin accounts/content/logs/usage, Profile/Settings, Help/Guide, persistence helpers, migrations, setup instructions, and test scripts.
- Passed: TypeScript, lint, production build (23 generated pages), activity, Playground, auth, media, audio, tutorial, gesture feedback/capture/stability, and category regression checks. Activity tests include PECS-over-gesture resolution, semantic exclusions, and the presence of built-in no-text assets.
- Two additional isolated fixtures reproduced duplicate built-in material hiding and an unauthenticated gesture-feedback request reaching a mocked provider. These did not contact a real provider or database.
- `npm audit --omit=dev` reported **12 affected packages: 1 critical, 9 high, 2 moderate**. These are dependency advisory classifications, not 12 demonstrated exploitable application paths. Build tools currently listed under `dependencies` are included.
- `npm run validate:materials` could not run: this checkout lacks the required Supabase URL/service-role configuration. Previously documented hosted findings were not revalidated here.
- No app server was started. Signed-in browser flows, actual phone/tablet rendering, webcam accuracy, live provider quality, storage round trips, and hosted policies were not exercised during this review. This is a broad source-and-checks review, not a complete penetration test or production certification.

## Action list

Priority **A** means address first; **B** means the next usability/reliability pass; **C** means planned maintenance. “Confirmed” describes a reproduced behavior or an explicit current code path. “Proposal” is an improvement choice. “Verification gap” requires additional testing.

| ID | Priority | Action | Evidence level |
|---|---|---|---|
| 01 | A | Review dependency advisories and upgrade the affected framework/toolchain. | Audit finding; deployed exposure unverified |
| 02 | A | Require an active account and enforce paid-request limits on gesture feedback. | Reproduced with a mocked provider |
| 03 | A | Prevent newly saved cards from disappearing when their labels match built-in cards. | Reproduced with a local data fixture |
| 04 | A | Show persistent load failures with Retry instead of empty libraries or zero usage. | Confirmed code paths |
| 05 | A | Make media deletion and cleanup report partial failures accurately. | Confirmed code paths; live failure untested |
| 06 | B | Show the effect on collections/activities before deleting a material. | Confirmed missing explanation and cascade relationships |
| 07 | B | Correct Help's statement about saved activity results. | Confirmed copy/implementation mismatch |
| 08 | B | Shorten Add material and replace internal terms with task-focused wording. | Copy proposal |
| 09 | B | Make login and action labels consistent. | Confirmed inconsistencies; copy proposal |
| 10 | B | Explain which uploaded gestures can actually be recognized. | Confirmed scope gap in guidance |
| 11 | B | Apply consistent keyboard/focus behavior to Student overlays and navigation. | Source-level accessibility gap; browser verification needed |
| 12 | B | Preserve or confirm discarding unfinished forms. | Confirmed close behavior; UX proposal |
| 13 | B | Make settings/activity-visibility saves reliable and honest about failures. | Confirmed save structure; race needs controlled verification |
| 14 | B | Recover Playground preparation jobs stuck in “processing.” | Confirmed missing expiry/reclaim path |
| 15 | B | Search/filter the full admin activity log rather than only loaded rows. | Confirmed current behavior |
| 16 | B | Give important notifications enough reading time and a persistent recovery path. | Confirmed three-second timer; UX proposal |
| 17 | C | Load feature-specific data and paginate growing datasets. | Confirmed broad queries; scale impact unmeasured |
| 18 | C | Consolidate current documentation and archive contradictory historical guidance. | Confirmed documentation drift |
| 19 | C | Verify a clean database setup and automate the standard check suite. | Documented setup gap; automation proposal |
| 20 | A | Complete a focused signed-in, mobile, storage, and provider acceptance pass. | Verification gap |

### 01. Dependency updates

Installed Next.js and its lint configuration are `14.2.35`; the audit classifies Next.js as critical. Other affected packages include PostCSS and transitive parsing/build utilities. Plan a compatible update with both dependency manifests, rather than an automatic forced major upgrade. Re-run the app checks and representative browser flows against the proposed versions.

The [publisher's Windows-hosting advisory](https://github.com/vercel/next.js/security/advisories/GHSA-p293-qw3h-jr36) affects the installed version range but depends on Windows server hosting. The [publisher's SVG image-optimization advisory](https://github.com/vercel/next.js/security/advisories/GHSA-2464-fhr4-w9xw) describes a glibc Linux/sharp-dependent path. Neither deployed hosting conditions nor exploitable image inputs were established here. The update task should determine applicability across all reported advisories, not infer exposure from severity alone.

Source: [package.json](../package.json), [package-lock.json](../package-lock.json), current registry audit.

### 02. Gesture-feedback API access and cost controls

`POST /api/gesture-feedback` validates a caller-supplied recognition payload and can immediately call Gemini. It has no active-account check or application quota check. The root middleware refreshes sessions but does not reject anonymous requests. A valid request without cookies reached the mocked provider once.

Require an active teacher/admin before a paid request, bound string/body sizes, and enforce request limits before contacting the provider. Preserve the learner's checked local feedback when the optional service is unavailable. Verify anonymous/inactive requests never invoke the provider and excess authenticated requests use the intended fallback.

Sources: [gesture-feedback route](../src/app/api/gesture-feedback/route.ts), line 41; [middleware](../src/lib/supabase/middleware.ts).

### 03. Newly uploaded duplicate-label cards disappear on reload

Content calls `ensurePecsManifestItems(..., { builtInOnly: true })`. That function merges *all* records matching a built-in label, including a teacher's new upload, and favors the canonical built-in ID when both have usable pictures. The Add material form does not reject that duplicate label. A fixture with `pecs-eat` and a teacher-uploaded `Eat` returned only `pecs-eat` for Content.

Choose an explicit duplicate policy: keep teacher-created records individually manageable, or explain and block duplicates before saving. Legacy seed cleanup must not silently hide a successful new upload. Acceptance: save a second Eat card, reload, and either find/manage it or have received a clear pre-save restriction.

Sources: [Content loader](../src/features/content/content-library-view.tsx), line 123; [material deduplication](../src/utils/pecs-content-library.ts), lines 133 and 169; [Add material](../src/features/content/card-form-dialog.tsx).

### 04. Failed loads resemble empty data

Content and Activities show a toast, mark loading complete, and can render an empty library after fetch failure. Playground similarly switches to an empty card set. Admin usage/log loaders catch failures by storing empty arrays, so “no usage” can also mean “could not load.”

Track loading, empty, error, and previously loaded states separately. Give each failed section a visible Retry action, retain previously fetched data where appropriate, and avoid enabling creation based on an incomplete library inventory. Verify a failed request cannot appear to erase existing records or report a trustworthy zero.

Sources: [Content](../src/features/content/content-library-view.tsx), line 134; [Activities](../src/features/activities/activities-view.tsx), line 158; [Playground](../src/features/playground/playground-view.tsx), line 250; [Admin](../src/features/admin/admin-panel-view.tsx), lines 102–147.

### 05. Media deletion can report more success than it achieves

Material deletion ignores Storage removal results before deleting media rows. Individual media deletion logs a Storage failure to the console and continues; subsequent attempts to clear the material URL also ignore returned database errors. A user can therefore see “File deleted” while an object remains in storage, or while a material retains its old URL. A later failure after the material itself was deleted can also produce a generic failure while the UI still holds that deleted material.

Represent partial success explicitly, keep enough information to retry cleanup, check unlink/update results, and refresh local records after a partial operation. Deliberately failing Storage or unlinking in a mock should leave accurate UI and a recoverable cleanup record. No live cleanup failure was induced in this review.

Sources: [deleteLearningItem](../src/lib/supabase/app-data.ts), line 528; [deleteMediaAssetFromSupabase](../src/lib/supabase/media.ts), line 121; [Content delete handlers](../src/features/content/content-library-view.tsx).

### 06. Explain material-deletion impact

The confirmation says the material leaves the library and offers media deletion, but does not name affected collections or activities. The schema cascades collection-item/activity-question links on material deletion; activity material ID arrays can still refer to removed cards. Deleting a sole answer can leave an activity with no playable questions.

Show the affected collection/activity count before deletion, define whether in-use materials should be blocked or archived, and handle resulting empty activities clearly. This does not require restoring learner tracking.

Sources: [material confirmation](../src/features/content/content-library-view.tsx), line 743; [schema relationships](../supabase/schema.sql), lines 120–149; [activity normalization](../src/utils/activity-symbol-options.ts).

### 07. Correct saved-results Help copy

Help says neither activity scores nor Guided 7 results are saved. `insertActivityPlay` saves a teacher-run Student Mode round's score, correct/incorrect counts, teacher/activity IDs, completion time, and duration. Gesture attempts remain unsaved; the teacher preview remains in memory; admin Student Mode play is not counted by this callback.

Suggested wording: **“Student mode activity results are saved for Admin usage reports. Teacher previews and gesture practice results are not saved.”** Keep the distinctions accurate without introducing individual learner records.

Sources: [Help FAQ](../src/features/help/help-content.ts), line 205; [recordPlay](../src/features/activities/activities-view.tsx), line 382; [insertActivityPlay](../src/lib/supabase/app-data.ts), line 658.

### 08. Reduce form explanation and internal jargon

Add material explains framing in the choice descriptions and again beneath them, then explains the label switch, individual uploads, filenames, storage notes, and both previews. The information is useful but competes with the actual fields. Material details also expose “MSAV checks” and “MSAV preparation incomplete,” which do not tell a teacher what to do.

Use one short instruction per decision, let the paired previews demonstrate the result, and move file-naming mechanics into optional help. Keep the word-free Activity-picture requirement visible; do not reintroduce the removed reminder/acknowledgment gate.

| Current wording | Suggested wording |
|---|---|
| “Use card outline” / “Use image as uploaded” plus another explanation | “Add a border” / “Keep original layout” with one short hint each |
| “MSAV preparation incomplete.” | “Not ready for Playground yet.” |
| “The card picture and MSAV checks are complete. Audio is optional.” | “Ready for Playground.” |
| “Try preparing again” | “Prepare for Playground” |
| File-naming guidance in the primary tour | Explain the picture upload and review step; leave naming in Help |

Sources: [Add material](../src/features/content/card-form-dialog.tsx), lines 317–377; [material readiness](../src/features/content/card-detail-dialog.tsx), lines 198–224; [Guide copy](../src/features/guide/guide-content.ts); [Help](../src/features/help/help-content.ts), line 53.

### 09. Make labels describe the same action everywhere

The login field is Email, uses email validation, and asks for a school email, but says “Enter username.” Help/cards use Play while the activity dialog uses Preview for the teacher player. Playground's Listen button becomes “Listening...,” although the app is speaking. The guided summary uses Cancel to mean close a finished result.

Suggested changes: **“Enter email address,” “Teacher preview”** consistently for the teacher player, **“Reading aloud...”** while Listen plays, and **“Back to practice”** for closing the finished guided summary. These are proposals: the username placeholder was a recent deliberate change and should be reconciled with the intended sign-in terminology before editing it.

Sources: [login](../src/features/auth/login-panel.tsx); [activity preview](../src/features/activities/activity-preview-dialog.tsx); [Playground actions](../src/features/playground/playground-view.tsx), line 767; [guided summary](../src/features/gesture/gesture-practice-view.tsx), line 2217.

### 10. Explain custom gesture scope

Teachers can add gesture materials, but the camera practice picker includes fixed gestures only. Saving a new gesture record does not add a class to the trained model. Current Add material/Help guidance does not make that distinction prominent.

Add a short teacher-facing explanation such as **“Saved in Content. Camera practice supports the seven built-in signs.”** Show the actual supported signs in Help. Keep Student Mode focused on its task; no model-training UI is proposed.

Sources: [Add material](../src/features/content/card-form-dialog.tsx); [gesture picker eligibility](../src/features/gesture/gesture-practice-view.tsx), line 2315; [gesture Help](../src/features/help/help-content.ts).

### 11. Consistent keyboard and accessibility behavior

The shared Dialog implements initial focus, a focus trap, Escape, and return focus. Several Student overlays are separately rendered `aria-modal` dialogs without equivalent handling, and the Student navigation drawer lacks the same focus/keyboard lifecycle. This can leave keyboard focus behind the visual overlay.

Reuse a shared accessible modal foundation while retaining each screen's visuals. Verify focus, Escape where appropriate, keyboard game completion, short-screen scrolling, large/extra-large text, and contrast settings. Also check small icon controls against the app's touch-target rules. Actual visual failures were not established by browser testing here.

Sources: [shared Dialog](../src/components/ui/dialog.tsx); [Student intro](../src/features/activities/player/student-intro-card.tsx); [Playground overlays](../src/features/playground/playground-view.tsx), line 791; [Student drawer](../src/components/layout/app-shell.tsx).

### 12. Prevent accidental loss of form work

Material, collection, and activity forms send close/backdrop/Escape directly to their close handler whenever they are not saving. An accidental outside click can discard multiple selected cards, staged images, or edited prompts.

Track whether the form has meaningful changes and either retain its session draft or ask to discard it on close. Keep a clean, untouched form easy to dismiss. Session state is sufficient; this does not require using browser storage as app persistence.

Sources: [material form](../src/features/content/card-form-dialog.tsx), line 46; [collection form](../src/features/content/lesson-form-dialog.tsx), line 62; [activity form](../src/features/activities/activity-form-dialog.tsx), line 82; [Dialog backdrop/Escape handling](../src/components/ui/dialog.tsx).

### 13. Settings and hidden-activity save reliability

Preferences and guide/hidden-activity changes each upsert a whole settings snapshot. Controls allow overlapping writes; completions can arrive out of order. `saveGuideSeen` deliberately retains a local change on failure, but `setActivityHidden` discards its success/failure result, so a teacher gets no indication that a visibility change did not reach the account record. Extra-large text and voice also have different device/account persistence rules, which are not obvious in the settings UI.

Serialize or merge writes safely, surface failures for activity visibility, and state which settings apply only on this device. Test delayed out-of-order responses and rejected saves. Preserve the useful rule that a failed guide-dismissal save must not immediately reopen the tour.

Sources: [settings provider](../src/features/settings/user-settings-context.tsx), lines 164–251; [settings controls](../src/features/settings/settings-view.tsx); [settings upsert](../src/lib/supabase/app-data.ts), line 721.

### 14. Recover stuck preparation jobs

The preparation endpoint marks a material `processing`, then rejects all future preparation attempts while it remains in that state. Unlike the Playground grading lease, there is no stale-job expiry in this path. A process termination or failed attempt to reset the state can strand the material.

Use an expiring claim and safely reclaim stale work. Ensure completion belongs to the current material version before applying its classification. Verify interruption after claim, retry after expiry, and edits during a pending request.

Source: [playground-prepare](../src/app/api/playground-prepare/route.ts), lines 59–87.

### 15. Admin log search should find older records

The admin loads the newest 50 log entries; text/type filtering and tab counts operate on loaded rows. The footer does say “loaded,” but a search can still show no matches even when matching older records exist. The administrator must repeatedly load unrelated pages to find them.

Apply supported filters/search before pagination, or clearly distinguish loaded-row search and provide a full-history search. Verify with a matching record older than the first 50 rows.

Sources: [admin paging](../src/features/admin/admin-panel-view.tsx), line 128; [log filtering](../src/features/admin/activity-section.tsx), line 154; [log query](../src/lib/audit-logs.ts), line 79.

### 16. Make important messages readable

All notifications disappear after three seconds; only mouse hover pauses them. Some material-save messages include readiness and a next action in several clauses. Touch and keyboard users can miss the recovery instructions.

Keep success toasts short. Give errors/partial success longer or explicit dismissal, pause while focused, and put essential next steps in the relevant page/dialog. Avoid showing the same login failure as both a long alert and a repeated long toast.

Sources: [toast provider](../src/components/common/toast-provider.tsx), lines 8 and 106; [material save messaging](../src/features/content/content-library-view.tsx), line 359; [login feedback](../src/features/auth/login-panel.tsx).

### 17. Reduce repeated loading and plan for larger libraries

`fetchMakaLearnData` loads nine tables together and is reused by screens that need only a small subset. A failure in an unrelated query can block the entire feature. Several growing queries have no explicit pagination; admin usage completeness can depend on the configured API row limit. The authenticated shell also preloads gesture assets even for users who do not open camera practice. The build reports 559 kB first-load JS for the gesture route, which is a measurement of bundle size, not a measured latency problem.

Split feature-specific loaders, paginate or aggregate growing histories, and measure gesture preloading on classroom phones before changing it. Preserve the full eligible PECS library for activity distractors when introducing pagination.

Sources: [shared loader](../src/lib/supabase/app-data.ts), line 185; [usage query](../src/lib/supabase/app-data.ts), line 678; [gesture preloading](../src/components/layout/app-shell.tsx), line 76; production build output.

### 18. Consolidate current guidance

Current facts are mixed with extensive historical notes. The product skill still describes retired learner/progress pages and simulated gesture recognition; CLAUDE overrides them, but future work must reconcile both. README's route summary calls Playground rule-based, while later sections correctly describe AI-first checking; an old pose guide describes a rule-based mapping. README also starts with `npm install` despite the worktree instructions requiring `npm ci`. Some source comments still claim private visibility is enforced only in the UI even though later migrations define role-aware read policies.

Keep one compact current behavior/setup reference, move history to clearly dated archives, update skills and misleading comments, and preserve the non-negotiable activity contract. Do not rewrite current roles or restore retired features based on the old brief.

Sources: [README](../README.md); [CLAUDE](../CLAUDE.md); [product skill](../.codex/skills/makalearn-product/SKILL.md); [old gesture guide](../GESTURE_SAMPLE_POSES.md); [current read policies](../supabase/migrations/20260925094204_collaborative_teacher_content.sql).

### 19. Reproducible setup and automated checks

README explicitly says migration history assumes an existing core schema and is not a verified empty-project bootstrap. The standalone schema retains historical structures. There is no `.github` CI directory in this checkout and no single standard verification script; the category regression script is run manually rather than through an npm test entry.

Create a reviewed, isolated fresh-project bootstrap and verify Auth profiles, Storage, views/RPCs, and seed ordering without resetting the hosted project. Separately, add one documented local check command and CI gates for the existing meaningful suites, TypeScript, lint, and build. Keep credentialed/live mutation tests opt-in. Gradually extract gesture UI/session helpers from the roughly 3,000-line view as those areas change, retaining current regression coverage.

Sources: [setup guidance](../README.md), line 125; [package scripts](../package.json); [schema](../supabase/schema.sql); [gesture view](../src/features/gesture/gesture-practice-view.tsx).

### 20. Signed-in acceptance pass before calling the system complete

Use the exact intended release, a teacher and admin account, and phone/tablet/desktop widths. Record pass/fail and evidence for these real workflows:

- Create a PECS material; inspect both artwork versions; save, reload, replace/unlink/delete media; test retry after a failed upload.
- Create/copy a collection; create all three active activity types; check private/shared access with a second teacher; play/restart/exit both players; verify no-text options and saved Student Mode usage.
- Build/check/listen to Playground cards, including grammar cards, new prepared materials, provider outage, and saved decisions.
- Start/stop webcam permission; recognize the seven supported signs; test wrong/no-hands feedback, guided retry/skip/end, and navigation cleanup.
- Create/deactivate/reactivate accounts; change roles; reset a teacher password; change one's own password; verify logged-out/inactive access and admin recovery expectations.
- Confirm text size, contrast, reduced motion, keyboard focus, Help links, and voice behavior on the supported devices.
- Run hosted material validation and reconcile actual database/storage references with the release.

No production mutation, live webcam/provider test, or deployment was performed for this report.

## Suggested first batch

Start with **01–05**, plus **07** as a small correctness fix. Then use **20** to verify the intended release. The wording pass (**08–10 and 16**) can follow without changing the overall visual identity or activity rules.
