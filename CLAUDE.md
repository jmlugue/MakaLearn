# MakaLearn session notes

Handoff for the next session. `AGENTS.md` holds the long-standing coding rules and `AGENT_HANDOFF.md`
the older project history. Where they disagree, this file wins. It covers the Content module finish,
Guide mode, the Activities redesign (section 6), and teammate changes (section 8).

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
- Colours: blue first. PECS is soft periwinkle, gestures sky blue, and category colours are user data,
  not decoration. See the colour rules before changing any of this.

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
  "From (lesson)". **Make a copy** shows on every lesson; Edit and Delete only for the owner or an admin.

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
| Teacher player: blue glass, numbered steps, Check then Next, feedback box, auto score pop-up | `player/teacher-player.tsx` |
| Full-screen frame: top bar and progress bar | `player/activity-player-screen.tsx` |
| Student game player (teammate code, split only) | `student-activity-player.tsx` + `player/*` |

- **Scores are view only.** `scoreActivity` no longer calls `insertActivityResult` (kept in `app-data.ts`),
  so the Admin "Most used activities" tile stops updating. Accepted by the user.
- Student mode: the result pop-up adds a final "Score X / Y" once every question in the round is answered.
  Match word only moves on after a correct answer, so its final score is usually full marks.
- Type colors are an agreed exception to the blue-first palette, accents only.
- `simple-quiz` stays (it plays as text choices). The user does not want existing features removed.

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
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
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
- **Admin indicator colors:** off blue so they read on a blue page. PECS and Activities amber, Gestures
  and Lessons teal (`accent-amber`, `accent-teal`, Tailwind amber/teal). Usage trend keeps blue changes and
  green sign-ins.
- **Landing:** the four floating signing kids are gone (`signing-kids.tsx` deleted). One "Makaton sign"
  paper note, taped to the carousel corner, shows the real drawing from `public/gesture-references` for
  the card in front. The carousel now holds only cards with a sign: Help, Drink, Yes, Eat, Toilet, Sit.
  Lives in `src/components/motion/learning-scene.tsx`. Hidden below `md`, as the kids were.
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
