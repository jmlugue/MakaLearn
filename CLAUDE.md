# MakaLearn session notes

Handoff for the next session. `AGENTS.md` holds the long-standing coding rules and `AGENT_HANDOFF.md`
the older project history. Where they disagree, this file wins. It covers the Content module finish,
Guide mode, the Activities redesign (section 6), and teammate changes (section 8).

**Design:** read `STYLE_GUIDE.md` before any UI work. It is the single source of truth for fonts, type,
colors, spacing, icons, components, and motion. Do not use `DESIGN.md` (out of date).

---

## 1. What MakaLearn is

Three stages, in order. Get this right, it has been described wrongly before.

1. **Content** builds **materials** (PECS cards and gestures, each with a picture, a video, and spoken
   audio) and groups them into **lessons**. Categories and the media library live here too. Materials
   and lessons are one stage, not two ideas.
2. **Activities** runs a lesson as practice, or builds a new activity from the teacher's own cards.
3. **Student mode** is the learner-facing half: a simpler full-screen interface with the playground,
   gesture practice with camera-based recognition, and activities.

There is **no Learners page**. `/learners` redirects to `/content` and
`src/features/learners/learners-view.tsx` is unreachable. Do not add to it or feature learner tracking.

**Admin** is admin-only: Home overview, Accounts, all teachers' Content, and an Activity log. An admin
also does a teacher's job, so admins see teacher content plus admin content. Teachers never see admin
content.

**Gestures have no attempts.** Gesture practice is live recognition with feedback. It is never counted,
charted, or saved. The `practice_attempts` table, its types, and `insertPracticeAttempt` /
`fetchPracticeAttempts` in `app-data.ts` still exist, but nothing writes to them and nothing new should
read them. Activity scores are view only too since Sep 19 (see section 6), so Admin's "Most used
activities" only reflects older `activity_results` rows.

---

## 2. What this session shipped

### Content: Materials attaches, Media owns files

The two tabs used to overlap. The rule now: **Materials decides which file is attached to a card, Media
decides which files exist.** Neither duplicates the other, and "Open material" in a media preview is
navigation, not editing.

- Remove an image, video, or audio from a material. A confirm asks, with a ticked box, whether to also
  delete the file from Media, so a file can be unlinked without being lost.
- Delete a file outright from the media preview pop-up. Hidden unless you uploaded it or are an admin.
  When the file is still in use the confirm names the material it will leave empty.
- Link filter on the Media tab: All files / Linked to a material / Not linked, so orphans are findable.

### Upload size limits

`src/utils/media-limits.ts` mirrors the caps in `supabase/storage.sql`: images 10MB, gesture video 50MB,
audio 20MB. Limits appear in every upload hint, oversized files are refused before uploading with the
size and the limit named, and the check also sits inside `uploadMediaAssetToSupabase` so every caller
including learner photos is covered.

### Lesson to activity link

`lessons.related_activity_id` is written when a lesson's activity is created or updated, and read on
load. Previously "Open activity" guessed by id pattern then by title match. Those fallbacks remain for
rows saved before this change.

### Guide mode (`src/features/guide/`)

On by default, switchable in Settings.

| Piece | File | Behaviour |
|---|---|---|
| Welcome tour | `guide-tour.tsx` | Once on first sign-in. Mounted once in `AppShell`, not per page. |
| Page intro | `guide-banner.tsx` | Blue strip on first visit to Content, Activities, Gesture practice, Admin. "Show me" opens the same stepped pop-up. |
| Hover bubbles | `guide-tip.tsx` | `<GuideTip id="...">` wraps a control. Renders the child untouched when Guide mode is off. |
| Copy | `guide-content.ts` | Every string, in one place. `welcomeStepsFor(role)` appends the admin steps for admins. |
| Animations | `guide-scene.tsx` | Small looping scenes. Reduced motion renders each in its finished state. |
| Settings | `settings-view.tsx` | "Guidance" group: the Guide mode switch and Replay. |

Teacher tour is three steps following the real path: build materials and lessons, run an activity, hand
over in Student mode. Admins get two more: accounts, then the overview and activity log.

### Bugs fixed

- **Deleting a material leaked its files.** "Also delete its media" removed the database rows but never
  the storage objects, and since `related_item_id` is `on delete set null` the link vanished with the
  material, orphaning the uploads permanently. Now it reads the file list first, deletes the material,
  then clears storage and the rows. Reordered so a delete refused by RLS no longer destroys media first.
- **Deleting another person's media silently did nothing.** RLS returns zero rows rather than an error.
  `deleteMediaAssetFromSupabase` now checks and says so. Same class of bug as the material delete fixed
  earlier; the Admin page benefits too.
- **The welcome tour would not close.** A failed save reverted the seen list, which re-fired the effect
  and reopened the tour, which also reset it to step one so Next appeared dead. The save no longer
  reverts, the list is mirrored to `localStorage`, and the tour holds a session guard.
- **A toast that lied.** Removing media from a seeded material with no Media row claimed the file was
  deleted. It now reports what actually happened.

---

## 3. Database state, read this first

**Sep 26, not yet run on live:** `supabase/migrations/20260926000000_service_role_private_schema.sql`.
Activating or deactivating an account failed with "permission denied for schema private": the Sep 25
profiles trigger calls `private.current_user_role()`, but only `authenticated` could use that schema,
and the admin routes run as the service role. Two `grant` lines fix it. elugs (who applied the Sep 25
migrations) should run it in the Supabase SQL Editor.
Workaround until then: `/api/admin/account-status`, `change-role`, and `create-teacher` write the profile
with the signed-in admin's session (`requireActiveAdmin` returns `sessionClient`), which the trigger and RLS
allow.

**Activity log fix (Sep 26):** `insertAuditLog` no longer reads the new row back. Teachers may insert but
not read `audit_logs`, so every teacher entry (logins, content, activities) had failed silently since Sep 25.

**Whole-app test:** `npm run test:app:db` (dev server running) runs 33 live checks with the test accounts.
`TEST_CREATE_ACCOUNT=1` also tests account creation and leaves a deactivated "[TEST] Created account".

**The migration has NOT been run on the live database.** Verified by probing PostgREST directly:

```
MISSING  user_settings.guide_mode
MISSING  user_settings.guide_seen
MISSING  lessons.related_activity_id
```

`supabase/migrations/20260916000000_guide_mode_and_lesson_activity.sql` holds the three
`add column if not exists` statements, mirrored into `supabase/schema.sql`. It is additive and
idempotent. Nothing is altered or dropped.

The app works without it because writes degrade on purpose. `isMissingColumn()` in
`src/lib/supabase/app-data.ts` detects the failure and retries without the new columns, in
`upsertUserSettings` and in `writeLessonRow` (used by `insertLesson` and `updateLesson`). Verified
against both real error formats, and it lets genuine errors such as RLS violations through.

**Until it is run:** the Guide mode toggle resets on reload, tour dismissal is per browser rather than
per account, and the lesson to activity link falls back to the old guess. Nothing errors.

**The owner does not have SQL access.** Whoever administers the Supabase project needs to run it once.
If the team shares one project, one run covers everybody.

---

## 4. Content module code shape

`content-library-view.tsx` is the shell: data load, state, handlers, and every dialog. Tabs and dialogs
are separate files beside it.

- Shared primitives live in `content-shared.tsx`: `kindMeta`, `toneClasses`, `CategoryPills`,
  `PopupTitle`, `SectionLabel`, `glassBoxClass`, `fieldClass`, `deleteButtonClass`, `categoryTints`,
  `sortRecords`.
- `Dialog` (`src/components/ui/dialog.tsx`) has app-wide blue glass, a `hideHeader` prop for an
  in-content title with a floating close button, and a reference-counted scroll lock so stacked pop-ups
  cannot leave the page unscrollable.
- Colours: blue first. PECS, Gestures, Lessons, and Activities use the shared map in
  `src/lib/entity-colors.ts` (section 11); category colours are user data, not decoration. See the colour rules before changing any of this.

---

## 5. Verification status

Passing: `npx tsc --noEmit`, `npx next lint --dir src`, `npm run build` (clean `.next`), all routes 200,
0 column mismatches across 11 tables, no unguarded restricted writes, all 6 API routes wired.

**Never verified signed in.** No session was available and passwords are off limits. Unchecked:

- Upload, replace, remove, and delete round trips actually hitting storage
- The welcome tour appearing once and staying gone
- Gesture camera and hand detection
- The activity player end to end
- AI activity draft (needs live Hugging Face and Gemini calls)

Do not run `npm run build` or clear `.next` while a dev server is running: it breaks that server with
"Cannot find module './NNN.js'". Stop the dev server first, or only run tsc and lint.

Highest-value manual check: delete a material with "also delete its media" ticked and confirm the file
disappears from the Media tab.

---

## 6. Activities and lessons (round 3; not yet verified signed in)

### Lessons hold many activities (one-to-one was dropped on request)

- **Lesson = the plan** (goal, instructions, cards), Shared or Private. **Activities** practise it.
- Activities are added to a lesson **only from Activities**: creator step 2 has "Part of a lesson"
  (create only). The card picker then shows only that lesson's cards. The lesson form no longer makes or
  syncs activities; its step 3 is Review again.
- Link storage, no database change: new lesson activities get the id `activity-${lesson.id}--${timestamp}`.
  Older links still count: `related_activity_id`, `activity-${lesson.id}`, and the old title pattern.
  An activity cannot move to another lesson later. Helpers in `src/utils/lesson-activity.ts`
  (`findLessonActivities`, `findActivityLesson`, `newLessonActivityId`, `canSee`, `uniqueCopyTitle`).
- **Make a copy**: lessons you cannot edit (only owner or admin can, by RLS) show Make a copy, which opens the
  form as a new lesson with a unique name ("X (copy)", "X (copy 2)"). A lesson name you can already see is
  refused on save.
- Lessons show nothing about their activities (the list and count were removed on request). Activities show
  "From (lesson)". **Make a copy** shows on every lesson for teachers; Edit and Delete only for the owner (admins are view only, section 17).

### Visibility and owners

- Private or Shared is picked **only when creating** (activities and lessons). Edit shows it read-only
  (`VisibilityControl` in `lesson-form-dialog.tsx`). Reason: RLS refuses a visibility change on someone
  else's activity, which surfaced as "Cannot coerce the result to a single JSON object". `updateActivity`
  now checks the row count and says who can change it.
- Others' private activities and lessons are hidden in the UI (`canSee`); read RLS allows everything.
- Shared items made by someone else show "By (name)".

### Activities page

| Piece | File |
|---|---|
| Shell: data, URL, save, delete | `activities-view.tsx` |
| Library: tabs All / From lessons / Private, Type dropdown, search, sort | `activity-library.tsx` |
| Card: type stripe and badge, picture collage, By name | `activity-card.tsx`, `activity-type-badge.tsx` |
| Preview pop-up with hover demo | `activity-preview-dialog.tsx` |
| Creator: Type, Cards (+ Part of a lesson), Review | `activity-form-dialog.tsx` |
| Types, colors (`activityTypeTones`), prompt helpers | `activity-helpers.ts` |
| Teacher player: blue glass, numbered circles, Check then Next, auto score pop-up (see section 10) | `player/teacher-player.tsx` |
| Full-screen frame: top bar and progress bar | `player/activity-player-screen.tsx` |
| Student game player (teammate code; one question at a time since section 10) | `student-activity-player.tsx` + `player/*` |

### Activity answer-option contract (do not regress)

This is the current accepted behavior for every activity surface:

- Answer options come only from image-backed PECS materials. Gesture materials and legacy gesture option values are excluded, including when a PECS card and gesture share a label.
- Distractors come from the full eligible PECS library, not merely the activity's selected answer cards, and rotate between questions and rounds instead of repeating a fixed pair.
- A distractor that is also a plausible answer must be excluded. For example, Food, Rice, Bread, and Banana are not safe distractors for an Eat prompt whose wording admits food-related answers. Semantic exclusions are part of correctness and require regression tests.
- Every visible option uses `public/pecs/generated_cards_no_text`. Standard card art with its printed label remains appropriate in Content, but not as an activity answer choice.
- Never render the answer word on an option or reveal it as the missing-image fallback. Use a neutral unavailable state; accessible screen-reader labels may still name the card.
- `simple-quiz` is labelled "Choose the word" and stores word answers for scoring, but its visible choices are no-text PECS pictures.
- The same rules apply to Student Mode, the teacher player, Match, Choose, Fill in the blank, Choose the word, Drag and drop, dropped-card views, result summaries, and activity samples/previews.
- Treat saved `question.options` as legacy input: resolve and filter it against the current PECS-only rules at play time. Use `npm run test:activities` as a required regression gate.

- **Scores are view only.** `scoreActivity` no longer calls `insertActivityResult` (kept in `app-data.ts`),
  so the Admin "Most used activities" tile stops updating. Accepted by the user.
- Student mode: the result pop-up adds a final "Score X / Y" once every question in the round is answered.
  Match word only moves on after a correct answer, so its final score is usually full marks.
- Type colors are an agreed exception to the blue-first palette, accents only.
- **Choose the word (`simple-quiz`) is retired (Sep 26)**: it was the same task as Match word to symbol. Hidden like `gesture-practice` via `retiredActivityTypes` / `isRetiredActivity` in `activity-helpers.ts`; the enum and old rows stay. Teachers make 4 types: Match word to symbol, Choose correct symbol, Fill in the blank, Drag and drop.

### Sep 26: instructions, sentences, one answer, database tests (not verified signed in)

- **Instructions:** one line per type from `activityInstruction()` in `activity-helpers.ts`, used by every
  Student layout, the teacher player, and Listen (which reads the instruction, then the word, question, or
  sentence). Match: 'Tap the picture for "Happy".' Fill: "Tap the picture that finishes the sentence."
  Choose: "Tap the picture that answers the question." Drag: "Drag each picture onto its word." On phones
  the banner sits on its own row above Back and Check.
- **Fill in the blank sentences** (`src/utils/fill-blank-prompts.ts`): one contextual sentence per PECS card,
  a situation plus a sentence ("My friend took my toy without asking. I feel ____."). The situation shows on
  its own line in Student mode. Saved activities that still use an old built-in sentence get the new one at
  play time; sentences a teacher wrote are kept (`isBuiltInFillBlankPrompt`). AI drafts ask for the same
  style; `ACTIVITY_PROMPT_TEMPLATE_VERSION` is `activity-prompt-v2`, so v1 cached drafts are not reused.
- **One right answer:** `activityMeaningGroups` in `src/utils/activity-option-sets.ts` (feelings, food,
  drinks, greetings, people, classroom actions, and so on). A wrong option never shares a group with the
  answer, for all types. Fill in the blank also keeps the same-sentence-role rule. Took over the Sep 25
  "semantic-activity-distractors" work (elugs); confirm with elugs before closing that board entry.
- **Create, edit, delete** live in `src/lib/supabase/activity-records.ts` (client passed in); `app-data.ts`
  keeps same-name wrappers. Refusal messages now say only teachers can change activities (admins are view
  only since Sep 25), and a private one only by its maker.
- **Tests:** `npm run test:activities` (logic, no database). `npm run test:activities:db` runs create, edit,
  delete, sharing, and admin cases against the **live** project, signed in as test accounts from
  `.env.local` (`TEST_TEACHER_*` required, `TEST_TEACHER2_*` and `TEST_ADMIN_*` optional). It only makes
  `[TEST]` records with ids starting `test-activity-` and deletes them afterwards. The user runs it.

### Fixed after testing

- Cut cards: PECS cards are 3:4 with the word at the bottom; the player's wells are now 3:4 with the image
  absolutely placed and `object-contain`. Question text is blue.
- Library could not scroll after closing the player from the score pop-up: the player saved its own
  `overflow` value while the pop-up used the counted lock. The player now uses `lockScroll`/`unlockScroll`
  exported from `src/components/ui/dialog.tsx`. Anything else that locks scroll must use them too.

### Pending

- The user asked what changed in Student mode Activities. The game player code is unchanged from before the
  redesign; teammates changed the student nav button and answer matching (card ids). Waiting on a screenshot.

---

## 7. Working conventions

- Concise output, no em dashes, in UI copy and in chat.
- Plan before building. The user says "let us plan" and expects questions and options first.
- The user commits and pushes. Do not commit unless asked.
- Secrets go in `.env.local`, which is git-ignored, pasted by the user. Never ask for them in chat.
- Commit messages carry no Claude attribution (no Co-Authored-By line). The user commits under their own name.
- Redesigns are incremental, not overhauls, and the look is blue-toned glassmorphism.
- Ask before removing or reworking a teammate's feature (Julian: gesture recognition and Guided 7;
  Lloyd: accounts and passwords). Prefer hiding over deleting.

---

## 8. Teammate changes since section 6 (Sep 18 to 19)

| Who | Commit | What changed |
|---|---|---|
| Lloyd | 1f6d5c1 | Password minimum is now **8** in create-teacher, reset-password, Accounts, Profile, and `supabase/config.toml`. "Forgot password" on sign-in now says "Contact your administrator" (no email reset). Profile dropped the "ask an admin to change your email" hint. |
| Julian | 64b37ca | Guided gesture recognition fixes and better corrective feedback (`gesture-practice-view.tsx`, `gesture-feedback.ts`). Student nav open state moved into `student-mode-context.tsx` so it survives page changes. Symbol-option activities now store the **card id** as answer and options, not the image URL (`createActivityQuestions`). New `npm run validate:materials` (read-only check of image files and material references). |

Notes:

- `tmp/timetable-monitoring/` and two timetable `.xlsx` files were committed in 64b37ca. They are
  Julian's scratch scripts for the Proposed Timetable sheet, not app code. Leave them unless asked.
- The email-based forgot-password plan (kept in memory) is probably superseded by Lloyd's
  contact-an-admin flow. Ask before building it.

---

## 9. Sep 19 changes (built, not verified signed in)

- **Admin Home:** Practice results tile removed (gesture attempts). Admin no longer fetches
  `practice_attempts`. Usage trend is full width. The average activity score moved to the foot of
  "Most used activities". `RingGauge` went with the tile.
- **Admin indicator colors:** replaced by the shared color map (section 11).
- **Landing:** the sign-card experiment (committed in 4a1e4c1) was reverted to the original carousel
  (Hello, Please, Help, Thank you, Drink), and the floating bubbles were then removed entirely on request.
  `signing-kids.tsx` is deleted. Do not add decorative bubbles or drawn figures back.
- **Playground** (`playground-view.tsx`, logic kept):
  - Adding a card plays its sound. A full board says so instead of silently ignoring the tap.
  - Five numbered slots on the sand board. The next slot is highlighted and grows while dragging.
  - Listen highlights each card as it is read (per card, or by word boundary for a valid sentence,
    also in the success pop-up).
  - Tap a card on the board to remove it (no X badge). Dragging still reorders.
  - Solid, child-friendly buttons: Check green, Listen blue, Clear red. Disabled on an empty board.
  - Each category has its own color and icon (`categoryStyles`). Student screens may be colorful; the
    blue-first rule is for teacher and admin UI.
  - The feedback strip appears only after Check. "Mix up" sits beside the Categories title.
  - The drop zone glows while a library card is dragged.
- **Teacher player** (`player/teacher-player.tsx`, `player/activity-player-screen.tsx`):
  - Plain app blue (#2563eb) everywhere, no blue-to-sky gradients.
  - The score pop-up opens by itself 1.2s after the last Check (no "See score" button).
  - After Check, a feedback box says "Correct! That is X." or "Not this one. The right answer is X.",
    with the right card's picture when wrong.
  - Progress: "Question 2 of 5" plus numbered circles (green tick, red cross, blue current), and a
    solid "2 of 5 done" pill and thicker bar in the top bar.
  - Restart and Edit are one joined white control in the top bar.
- **Help FAQ:** no longer mentions gesture attempts.

Guided 7 (Julian's gesture summary) keeps its session-only "Attempts" wording: the user decided to leave
it as is. Playground layout (strip on top, side tabs, or polish only) was discussed and put on hold.

Worth clicking once signed in: Admin Home layout at xl width, playground on a phone and in Student mode,
card sound on tap, Listen highlight.

---

## 10. Sep 19, round 5 (built, checked on a temporary page with sample cards, not signed in)

- **Lessons are title and goal only** (plus materials). Instructions are no longer shown or asked for; step
  chips were tried and removed on request. The `instructions` column stays: new lessons save "", edits keep
  what an older lesson had. The "10 min" tag is gone from cards and previews (every lesson had the default
  10; the column stays).
- **"Auto-made" badge:** a lesson made with **Generate lesson** on a material card. Kept as is.
- **Teacher player:** no "Question 2 of 5" line (the top bar has "2 of 5 done") and no feedback box after
  Check. The cards alone show right and wrong (green or red border, tick or cross, the right card green).
  No "Play again" after the last Check (it was easy to press by accident and skip the score pop-up); the
  pop-up opens by itself and Restart stays in the top bar.
- **Gesture practice activity retired:** gestures are practised with the camera on the Gestures page.
  Removed from the creator, library, and Student mode (`isRetiredActivity` in `activity-helpers.ts`). The
  enum value and old rows stay in the database. It was in the original MVP list in `AGENTS.md`; the user
  chose to remove it anyway.
- **Simple quiz** is labelled "Choose the word". elugs removed it on Jul 1 (ba8cd1b) and re-added it on
  Sep 3 (aa7d392).
- **Student mode:** the layout bugs were not from the redesign. Its CSS classes match the version before
  5bddd45 exactly. Fixed:
  - Fill in the blank and Choose the word used to show every question at once, so cards overlapped. They now
    use the one-question-at-a-time layout (`player/choose-question.tsx`). `choice-list-question.tsx` is
    deleted.
  - Activity choices deliberately use the dedicated `generated_cards_no_text` PECS artwork. `SymbolOption`
    places the picture absolutely inside its box with `object-contain`, so the box sets the size without
    clipping. A missing picture is treated as a content problem rather than replacing an answer with a
    visible identifying word.
  - The Activities switcher floats over the game with a backdrop; a tap outside closes it.
  - **Pick, Check, Next**, as in the teacher player, for Choose, Fill in the blank, Choose the word, and Match.
    Tapping a card only marks it. Check locks the question and shows green and red; after the last Check the
    score pop-up opens by itself (1.2s). "Try again" or "Practice again" starts a fresh round. Shared pieces:
    `CheckStepFooter`, `checkedOptionState`, `checkedOptionClass`, `CheckedOptionBadge` in `player-parts.tsx`.
    History: elugs' first Student mode (41258f7, Jun 30) had a big green Check; auto-advance came with
    Lloyd's Match (d14cf96, Jul 1) and the paged Choose (1c494ff, Sep 13). Drag and drop always had Check.
  - Result pop-up cards were blank after the `SymbolOption` change: the card box needs a set height (`h-full`).
- **Open question: teachers editing or deleting.** The user says only admins can. Repo rules
  (`20260903010000_fix_shared_activity_permissions.sql`) let teachers edit and delete shared activities, but
  the Sep 2 rule allowed only the owner or an admin. If the live database never ran the Sep 3 migration,
  teachers are refused. Lessons are owner or admin only by design (Make a copy). Needs the user's answer and
  someone with SQL access.

---

## 11. One color per main thing (Sep 19, not verified signed in)

The user found PECS purple in Content, amber on Admin Home, and blue in the Admin Content tab. Now one map,
`src/lib/entity-colors.ts`, is used everywhere. Never give these a section-specific color.

| Thing | Color | Where it shows |
|---|---|---|
| PECS | soft periwinkle (indigo) | Content cards and badges, Activities preview, Admin Home count and badges, Admin Content tab and detail |
| Gestures | sky blue | same places, plus the Gesture practice page (Guided 7 accents moved from indigo to sky) |
| Lessons | blue | Admin Home Lessons row, lesson cards |
| Activities | teal | Admin Home Activities row |

- `kindTone()` and `KindBadge` in `content-shared.tsx` read the map. `materialColor(contentType)` gives a
  learning item's colors.
- Categories are exempt (teacher-chosen, may repeat). Activity type pastels stay (they tell types apart).
- Meaning colors stay as they are: green added or signed in, amber edited or a warning, red deleted.
- Student mode has no PECS or Gesture labels to recolor; playground category colors are categories.
- The `accent-amber` and `accent-teal` Tailwind tokens are no longer used for kinds.

---

## 12. Activities design cleanup (Sep 26, checked on a temporary page, not signed in)

- **Icon:** Activities uses `Shapes` (sidebar, mobile and student nav, page header, guide). The pulse icon is
  only for the Admin activity log.
- **Type names and colors:** teacher screens show short names (Match, Choose the picture, Fill in the blank,
  Drag and drop) with an icon on every badge. Colors moved off blue and teal: violet, orange, yellow, pink.
- **Default name:** "Feelings match activity" (`src/utils/activity-title.ts`). Topic is the lesson, else the
  main category, else the first card. `buildActivityTitle` in `activity-ai-draft.ts` is no longer used by the form.
- **Creator:** steps are Start, Cards, Review. Start holds "My own cards / From a lesson" (searchable lesson
  list) and the format tiles. Cards is only card picking, with a 5-slot tray (`MaterialsStep tray="slots"`;
  the lesson form keeps its chips). Review: name with a Private switch, a summary line, and one row per card
  with its question. One AI button: "Draft with AI", or "Try again with AI" once every card has a question.
- **Card and preview:** one-line title and one meta line. Preview shows the demo first, then the cards.
- Category colors were left for a later session on request.

---

## 13. Student mode activities redesign (Sep 26, checked on a temporary page, not signed in)

From client testing and the dean's review: inconsistent text sizes, a cramped activity dropdown, and kids not
seeing they were right. Student mode only; the teacher player is unchanged.

- **Picture menu:** Activities in Student mode opens `student-activity-menu.tsx` (big tiles, type color,
  pictures, 2-line title). Home in the game returns to it. `?play=` and `?type=` links still open a game.
- **How to play card** (`player/student-intro-card.tsx`) before the first round, read aloud. Play again skips it.
- **One tap answers** Match, Choose the picture, Fill in the blank. Big "Correct!" / "Not this one" pop-up (shows
  the right card), spoken, next question after 1.8s. One try per question. No Check, Next, or Back.
- **Drag and drop is drag only** (pointer events, works on touch). Right drop stays with "Correct!", wrong one
  flies back with "Try again". Score counts boxes right on the first drop.
- **Hint** greys out one wrong card per tap and reads the question. Stops at two cards left.
- **One type scale** (`player/student-theme.ts`), same card size in every game. See STYLE_GUIDE section 10.
- The player keeps its own state now (`StudentActivityPlayer` takes `activity`, `learningItems`, `onHome`).
  `ActivityResultModal` is Student only and takes `firstTryRight`. `match-question.tsx` was merged into
  `choose-question.tsx`; old footer, navigator, and grid helpers were removed.
- Round 2 after testing: instructions read "Find the picture..."; How to play card has the demo and a blue
  instruction box apart, plus "Don't show this again" (localStorage `makalearn.studentIntroHidden`, per
  activity). Wrong taps have no pop-up: cards shake, the pick says "Not this one", the right card glows with "This one!". Drag and drop
  progress is green once placed; the score says "X of Y right" (first drops) with amber arrows for retries.
- Not verified signed in, on a real touch tablet, or with real speech timing.


---

## 14. UI pass: landing, login, admin, app-wide (Sep 26, checked on a temporary page, not signed in)

- **Landing:** an accent pass (flat shapes, colored word underlines) was **reverted on request**. The landing is
  the original glass design again. Do not remove its orbs or glass to add color.
- **How it works:** blue step bars kept. "Get feedback" mirrors the real Gesture practice screen ("Show Eat"
  chip, green "Great job!" card) on a **white** frame; the user rejected the dark camera look.
- `brand-red`, `brand-yellow`, `brand-blue` tokens in `tailwind.config.ts` are used only by the loader dots and
  the Student mode switch card. Restart the dev server after pulling so Tailwind picks them up.
- **Login:** "No account yet? Contact your school administrator." removed.
- **Admin:** `PillTabs` (`ui/pill-tabs.tsx`) with icons replace the underline tabs; sections rise in on switch.
  Admin icon is a shield with a person (`src/components/icons/shield-user.ts`, Lucide's `ShieldUser` paths; the
  installed lucide-react is too old to have it). The guide uses `LayoutDashboard` for Home. `BrandLogo` uses the
  cropped `public/makalearn_logo_mark.png`. Home: type sizes to the guide, ring in PECS/Gesture colors,
  Activities icon `Shapes`. Accounts: `FilterSelect` ("Role All", "Status All"); Temporary password pop-up
  with an account row; Add account with role tiles, field icons, and Generate / show / Copy on the password.
  Activity log: "Materials" filter is now "Content"; date ranges Today, Yesterday, Last 7 days, This week,
  Last 30 days, This month, Last month (`rangeBounds` in `admin-shared.tsx`); new log pop-up.
- **Dialog bug fixed:** the corner glow stuck out of the panel, so focusing a control near the right edge
  scrolled every pop-up sideways (the "temp password alignment" report). The glow is now in a clipped layer.
- **Toasts:** glass card, meaning stripe, icon tile, timer bar, hover pauses; bottom right (top on phones).
- **Loading:** `LoadingScreen` / `LoadingState` show the bobbing logo and three colored dots. Entering or
  leaving Student mode shows a ~1s card (`student-mode/student-mode-transition.tsx`, mounted in the provider).
- **Two menu levels:** main sections use pills (`PillTabs`); anything under them uses `UnderlineTabs`
  (Materials PECS / Gestures, Media type, Admin Content Materials / Media, Activity log type). The user
  rejected a second row of pills. Media "Linked" is a `FilterSelect`.
- **Cards are picture only:** material cards show the stripe and picture; name, audio, and category show when
  opened (name kept as `aria-label` and hover `title`). Media thumbnails dropped their file name. Category
  cards keep name and count but dropped the description line.
- **Admin Content pop-ups** (`content-detail-dialog.tsx`) use the Activity log style: icon tile header, white
  `DetailList` of `DetailRow`s with icons, `DetailNote` boxes (shared in `admin-shared.tsx`).
- Lessons were left to another session. Activity and lesson name shortening was skipped on request.

---

## 15. Content page cleanup and file name rule (Sep 26, checked on a temporary page, not signed in)

- **File name rule (advisor):** uploads must be named `<word>_<category>.<ext>` for the material's own label
  and category, e.g. `eat_food.png`, `thank-you_greetings.mp3` (spaces become hyphens, any case). Refused files
  name the expected file. In Add material, a valid file picked before typing a label fills the label and
  category. Checked in the form, the detail pop-up, and inside `uploadMediaAssetToSupabase` (`expectedName`).
  Helpers and allowed extensions: `src/utils/media-filename.ts`. Test: `npm run test:media`.
- **Menu:** Content sections use `PillTabs` (with counts); PECS / Gestures, media type, and linked filters use
  `SegmentedControl`. Category pills sit on their own row.
- **Cut-off cards fixed:** pictures sat in square grid cells and kept their own height, so the bottom of each
  3:4 PECS card (the word) was cropped. `PictureBox` in `content-media.tsx` fixes it; use it for card pictures.
  The CategoryPills measuring row also widened the page on phones; it is now clipped.
- **Materials:** no PECS / Gesture badge, whole card tinted by kind, no video anywhere in Content or Admin
  content (old video files show as "Old video file" so they can be deleted). Detail pop-up is one layout:
  picture and Play word, title, description, Files (Picture, Audio). Tags are hidden (the column stays;
  kind detection still reads it).
- **"Fixed gestures" category hidden** (`visibleCategories`, `isHiddenCategory` in `content-shared.tsx`). The 7
  built-in gestures stay in it for Guided 7 and still cannot be deleted. File names for them use `gestures`.
- **Automate removed:** Generate lesson, the draft lesson mode, Auto-made badge and filter, and
  `lesson-template.ts` are gone. The `source` column stays; new lessons save "manual".
- **Lessons:** full-width plan rows with a numbered card strip. Form: Title plus optional Description (saved in
  `objective`), Cards step uses the slot tray without a max ("Lesson order"), Review and preview show numbered
  steps.
- **Categories:** an empty category shows only its color. **Media:** the "Every file in MakaLearn" line is gone;
  thumbnails are small tinted cards instead of a dot.
- **Not verified signed in:** real uploads with the new names, and the Admin content views.

---

## 16. Notes round (Sep 26, checked on a temporary page, not signed in)

- **Eat gesture wording:** the fixed recognition phrase is now "I want to eat" while keeping the existing
  `gesture-eat-food` ID and trained model `eat` class. Its spoken clip uses the cache-safe stored filename
  `gesture-eat.wav`.
- **Free Practice reference:** the right-side card no longer flips. It always shows the former back face
  with the gesture media and Play control. Guided practice keeps its existing flip interaction.

- **Create activity:** Format tiles show full type names plus a one-line description. "From a lesson" is a
  dropdown with search (closed, it shows the chosen lesson with a tick). Step 2 puts the card library in its own
  "Choose cards" panel under the picked slots (the lesson form gets it too, since it shares `MaterialsStep`).
  Default name is "Matching activity: Feelings" (`activityTypeNamePhrases`, `activity-title.ts`).
- **Demo** (`content/activity-sample.tsx`) now mirrors Student mode: blue instruction strip, 3:4 picture cards,
  the real option builder, sentence gap that fills, green "Correct!", red "Not this one". Drag and drop shows
  three word boxes and their cards travelling with the pointer. It uses the chosen lesson's cards.
- **Student mode:** the How to play card no longer shows the activity name. The in-game instruction is a solid
  blue banner with a hand icon.
- **Fill in the blank sentences** are 7 to 12 words (test enforces it). The longer Sep 26 set is kept as
  `longFillBlankPromptByLabel` so saved activities using it upgrade at play time.
- **Toasts** are top right again (top center on phones), sliding in from the right. Design unchanged.
- **Admin Activity log:** type filters (All, Sign-ins, Content, Accounts) are category-style pills
  (`FilterPills` in `admin-shared.tsx`); the date range stays a dropdown (`FilterSelect`).
- **Gesture cards** show their name under the picture (PECS art already has the word).
- **Student mode switch card:** entering shows red, yellow, green, and sky shapes and a four-color band;
  leaving stays plain blue. Uses standard Tailwind colors, not the `brand-*` tokens.
- **Colors finalized:** built-in categories use one hue in Content and the playground
  (`src/lib/category-colors.ts`, applied in `ensurePecsManifestCategories` and Admin; the color picker is
  replaced by a note for them). Activity types and main item colors unchanged and locked. See STYLE_GUIDE.


---

## 17. Admin view only, question rules, playground pop-ups (Oct 1, not verified signed in)

- **Admins are view only.** Content and Activities writes were already teacher only (UI and the Sep 25 RLS).
  Now admins also cannot **play**: no Play on cards or the preview, a `?play=` link opens the preview, and the
  preview demo has no "Try it yourself". Student mode still plays for everyone. Admins cannot Make a copy of a
  lesson (supersedes section 6). Admin tour and page banners use view-only wording (`pageGuideFor`,
  `welcomeStepsFor` in `guide-content.ts`).
- **Question rules** (tests in `scripts/test-activity-rules.mjs`): one short sentence with a situation, and the
  answer word never appears. Choose the picture questions were rewritten in `starter-learning-item-prompts.ts`
  ("How do I feel when my toy breaks?"); the old ones are kept as `legacyChooseCorrectSymbolPromptsByLabel` and
  upgraded at play time. **Bug fixed:** that upgrade used to overwrite questions teachers wrote; now only
  built-in ones are upgraded (`isBuiltInChooseCorrectSymbolPrompt`).
- **Teacher-made cards:** a category mixes things, actions, and words, and a teacher's card does not record
  which it is, so no category sentence fits every card. Fill in the blank starts empty (the teacher writes it
  or uses Draft with AI; save is blocked until it is filled). Choose asks "Which picture is from (category)?"
  (`src/utils/category-prompts.ts`). Never "Use ____ to talk about three."
- **Wrong choices:** a teacher-made card keeps its whole category out of the choices. The question text is read
  too (`isQuestionRelatedDistractor`): cards it names, or groups it points at ("eat", "feel", "say", "who"), are
  used only when nothing else is left. More Fill in the blank second answers in `fillBlankAlsoFits`.
- **AI drafts:** Fill 7 to 12 words, Choose must be situational, a draft naming its answer is dropped.
  `ACTIVITY_PROMPT_TEMPLATE_VERSION` is `activity-prompt-v3`.
- **Playground:** a wrong Check opens an amber "TRY AGAIN" pop-up (spoken) instead of a toast and strip; right
  keeps "GOOD JOB". Am, Is, or Are alone is no longer right. Good morning and Thank you count as expressions.

- **Upload names (Oct 1):** only the name is checked (`bad_emotions`), never the extension, because Windows
  hides extensions and renamed files became `bad_emotions.png.png`. The file type is checked from the file's
  own MIME type (`allowedMimeTypes` in `media-filename.ts`). Hints show the name without an extension.
- **Activity creator:** Format tiles show the name only, no description line.
- **Sentence pass (Oct 1):** reworded the awkward built-in sentences (Fill: wash hands, no ("asks if the sky is green"), am ("I ____ a student."), danger;
  Choose: I, you, eat, drink, danger, hot, hurt;). Card names
  are unchanged. Old wordings are kept in the retired tables so saved activities upgrade. Saving an activity
  stores its questions as templates, so the creator now swaps an old saved built-in question for the current
  one (`getSavedQuestionPrompt`); a teacher's own question is kept.
- **Uploads (Oct 1):** a wrongly named file is never refused.
  - **Add material:** any picture or sound of the right type is taken. Its name fills whatever is still blank
    (`guessFromFileName`): `happy_emotions` gives label and category, `happy` only the label, IMG_2044 nothing.
    **The label only fills from a symbol or gesture word**: the PECS manifest, every material label (passed as
    `knownLabels`), and a starter list of common Makaton / PECS words (`src/data/symbol-vocabulary.ts`, not
    official Makaton; single letters left out). Random words or letters leave it blank. Categories still fill from any real
    category name.
    Replacing or removing a file refills them from the newest remaining file name (`fillFromNames`), but only
    fields that are blank or came from a file; anything typed or picked by hand is kept.
    Category starts empty ("Pick a category"). On Save each file is renamed to the card's word_category
    (`renameFile`), so stored files always follow the rule. Hints say "Saved as bad_emotions".
  - **A material's Upload / Replace:** `RenameFileDialog` (`rename-file-dialog.tsx`) opens with the right name
    filled in; "Use this name" or edit it, and it must still match the card.
  - Wrong file types and oversized files are still refused. `FileUpload.onUpload` may resolve with a renamed file.
