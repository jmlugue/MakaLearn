# MakaLearn session notes

Handoff for the next session. `AGENTS.md` holds the long-standing coding rules and `AGENT_HANDOFF.md`
the older project history. This file covers the Content module finish, Guide mode, and the Activities
redesign (section 6).

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

## 6. Activities redesign (shipped, not yet verified signed in)

### Lesson vs activity, settled

**Lesson = the plan** (goal, instructions, cards). **Activity = one practice step** the learner plays.
One PECS lesson links to at most one activity; activities can also stand alone. Gesture lessons use
Gesture practice. Based on Julian's Jun 22 wording ("It can include an activity as one practice step"),
his Jun 28 auto-create, and the timetable's "Open related activity or practice action".

- Lesson pop-up step 3 is now **Practice**: format picker, demo, and a **Create activity for this lesson**
  tick (on for new and generated lessons, off when editing). A linked lesson shows "Linked: (title)".
- No untick-to-unlink: `lessons.related_activity_id` is still missing on the live DB (section 3), so an
  unlink would come back on reload. The link falls back to the id `activity-${lesson.id}`.
- Lesson preview shows a Practice row and **Play activity** / **Create activity** / **Practice gesture**.
- Shared helpers: `src/utils/lesson-activity.ts` (`findLessonActivity`, `findActivityLesson`,
  `lessonActivityId`, `activityPlayHref`).

### Activities page

| Piece | File |
|---|---|
| Shell: data, URL, save, delete | `activities-view.tsx` |
| Library: tabs All / From lessons / Mine, search, sort | `activity-library.tsx` |
| Card with picture collage cover | `activity-card.tsx` |
| Preview pop-up with hover demo | `activity-preview-dialog.tsx` |
| Creator: Type, Cards (or start from a lesson), Review | `activity-form-dialog.tsx` |
| Types, prompt helpers | `activity-helpers.ts` |
| Full-screen teacher player + left bar (Exit, Restart, Edit) | `player/activity-player-screen.tsx` |
| Student player, split from 2,084 lines, logic unchanged | `student-activity-player.tsx` + `player/*` |

- Player opens at `/activities?play=<id>` (old `?activityId=` still works). Teachers use the same game
  player as Student mode, portaled above the sidebar. Student mode is unchanged.
- The card picker is `MaterialsStep`, now exported from `lesson-form-dialog.tsx` with `kinds` and `max`.
- `simple-quiz` stays. It is not in the thesis, but it does play (text choices via the generic layout).
  The user does not want existing features removed; hide rather than delete.

### Not verified

Never checked signed in. Worth clicking: create from a lesson, lesson tick on and off, Play from Content,
Exit and Restart in the player, Edit from the player, delete a lesson-owned activity.

---

## 7. Working conventions

- Concise output, no em dashes, in UI copy and in chat.
- Plan before building. The user says "let us plan" and expects questions and options first.
- The user commits and pushes. Do not commit unless asked.
- Secrets go in `.env.local`, which is git-ignored, pasted by the user. Never ask for them in chat.
- Commit messages end with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- Redesigns are incremental, not overhauls, and the look is blue-toned glassmorphism.
