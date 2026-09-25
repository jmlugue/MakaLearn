# MakaLearn Style Guide

The single source of truth for how MakaLearn looks. Read this before any UI work.

- Built from the code on Sep 25 (`globals.css`, `tailwind.config.ts`, `src/components/`, feature files).
- `DESIGN.md` is out of date (Sep 8). Do not take design facts from it.
- Labels used below:
  - **Built**: what the app does today. Match it.
  - **Rule**: follow this for new or changed screens.
  - **Planned**: agreed direction, not in the code yet. Do not assume it exists.

Stack: Next.js 14, React 18, Tailwind CSS 3.4, Framer Motion, lucide-react icons. No dark mode.

---

## 1. Look and feel

| Principle | Meaning |
|---|---|
| Blue-toned glassmorphism | Frosted white panels over a soft blue wash. Blue is the only brand color. |
| Calm teacher UI, playful student UI | Teacher and Admin screens are quiet and blue. Student mode may be big, bold, and colorful. |
| Incremental, not overhauls | Improve a screen step by step. Keep what teammates built; hide rather than delete. |
| Show, don't explain | Short labels, one short sentence at most. No em dashes in any copy. |
| Color means something | Green, amber, red only for success, warning, error. |

---

## 2. The four views

| View | Who | Where | Look |
|---|---|---|---|
| **App** (Content, Activities, Admin, Help, Settings, Profile) | Teachers, admins | `AppShell` with sidebar | Glass panels, blue, `max-w-7xl` centered |
| **Student mode** (Playground, Gestures, Activities) | Learners | Same shell, no sidebar, logo button opens a drawer | Full width, big targets (56px+), `font-black`, bright colors |
| **Full-screen player** | Teacher runs an activity | `player/activity-player-screen.tsx`, fixed over the page | Blue wash, white top bar, flat `blue-600` |
| **Landing and Login** | Visitors | `app/page.tsx`, `app/login` | Own backgrounds (`.landing-page`, `.login-page`), soft glass orbs. No drawn figures or floating bubbles. |

---

## 3. Fonts

**Built**

- One family everywhere, set on `body` in `globals.css`:
  `"Aptos", "Avenir Next", "Segoe UI Variable", "Segoe UI", sans-serif`
- Font features `ss01`, `cv02`. Body letter spacing `-0.008em`.
- Not downloaded, so each device shows a different font (Aptos only on Windows with Microsoft 365).

**Planned**

- **Plus Jakarta Sans** (Google Fonts, free) via `next/font/google` in `src/app/layout.tsx`, Aptos kept as fallback.

---

## 4. Type scale

**Rule** (teacher and admin screens)

| Level | Classes | Example |
|---|---|---|
| Page title | `text-3xl md:text-4xl font-extrabold tracking-[-0.035em] text-ink` | "Content" (`PageHeader`) |
| Pop-up title, big | `text-2xl sm:text-3xl font-extrabold tracking-[-0.03em] text-ink` | `PopupTitle` |
| Pop-up title, standard | `text-xl font-extrabold tracking-[-0.02em] text-ink` | `Dialog` header |
| Section title | `text-xl font-bold text-ink` | "Materials" |
| Card title | `text-base` to `text-lg`, `font-semibold` or `font-bold`, `text-ink` | Material and activity cards |
| Body | `text-sm leading-6 text-slate-600` | Descriptions |
| Label | `text-sm font-semibold text-slate-700` | Form labels |
| Hint | `text-xs leading-5 text-slate-500` | Upload limits |
| Group heading | `text-xs font-bold uppercase tracking-[0.08em] text-slate-500` | Settings groups |
| Badge | `text-[11px] font-bold uppercase tracking-wide` | PECS, activity type |
| Big number | `text-3xl font-bold text-ink` | `StatCard` value |

- **Weights:** 400, 600, 700, 800. `font-black` (900) only in Student mode and the players.
- **Smallest size:** 12px (`text-xs`) for new work. Badges and mobile nav labels use 11px today; do not add
  any new 8, 9, 10, or 11px text.
- **Student mode:** `text-lg` to `text-4xl`, `font-black`.

---

## 5. Colors

### Base (Built)

| Role | Value | Tailwind |
|---|---|---|
| Page wash | `#f8fbff` → `#eef4ff` → `#f4fbff`, plus faint cyan, indigo, and blue glows (fixed) | `body` in `globals.css` |
| Ink (all headings and text) | `#172033` | `text-ink` |
| Primary blue | `#2563eb` | `primary`, `blue-600` |
| Blue text on white | `#1d4ed8` | `blue-700` |
| Blue borders, fills | `#dbeafe`, `#eff6ff` | `blue-100`, `blue-50` |
| Light blue fill | `#eef7ff` | `skywash` |
| Body text | `#475569` | `slate-600` |
| Hint text | `#64748b` | `slate-500` |
| Text selection | `#bfdbfe` | |
| Focus ring | `rgba(37,99,235,0.18)`, 3px, offset 2px | `--focus` |

Rules:

- About 60% wash and glass, 30% ink, 10% blue.
- Grey text is `slate-500` or darker. `slate-400` only for placeholders and search icons.
- Solid white inside glass: write `bg-[#fff]`. Plain `bg-white` inside `.app-canvas` becomes 70% frosted.

### Meaning colors (Built, only when they mean something)

| Meaning | Text | Fill | Border |
|---|---|---|---|
| Success, added, correct, saved | `emerald-600` / `emerald-700` | `emerald-50` | `emerald-200` |
| Warning, edited, hint | `amber-700` | `amber-50` | `amber-200` |
| Error, delete, wrong | `red-600` | `red-50` | `red-200` |

Rule: one family per meaning (emerald, amber, red). Older code also uses `green`, `lime`, `rose`, `yellow`,
`orange`; replace them when you touch that code. The answer states in the players use `rose` today.

### One color per main thing (Built, `src/lib/entity-colors.ts`)

| Thing | Color | Stripe | Badge |
|---|---|---|---|
| PECS | Soft periwinkle (indigo) | `bg-indigo-300` | `bg-indigo-100 text-indigo-800` |
| Gestures | Sky | `bg-sky-400` | `bg-sky-100 text-sky-800` |
| Lessons | Blue | `bg-blue-600` | `bg-blue-100 text-blue-800` |
| Activities | Teal | `bg-teal-400` | `bg-teal-100 text-teal-800` |

Rule: always read these from `entityColors` (or `kindTone()` in `content-shared.tsx`). Never give a thing
a page-specific color. Each entry also has `soft`, `border`, `hoverBorder`, `icon`, `solid`, `text`, `wash`.

### Exempt colors (Built)

| Where | Colors | File |
|---|---|---|
| Activity types (accents only, always with the type icon) | Match: violet (`ArrowLeftRight`). Choose the picture: orange (`MousePointerClick`). Fill in the blank: yellow (`TextCursorInput`). Drag and drop: pink (`Move`). No blue or teal, so no type looks like Lessons or Activities. | `activityTypeTones` in `activity-helpers.ts`, icons in `activity-type-badge.tsx` |
| Categories (teacher picks) | 12 pastel presets: blue, sky, teal, green, lime, yellow, orange, coral, rose, pink, lavender, slate. `tintDot()` makes the dot color. | `categoryTints` in `content-shared.tsx` |
| Playground categories | All: blue. Greetings: amber. Emotions: pink. Family: violet. Food: orange. Classroom: teal. Daily needs: emerald. Safety: red. Each has an icon. | `categoryStyles` in `playground-view.tsx` |
| Confetti | yellow, sky, emerald, rose | `globals.css` |
| Brand accents (`brand-red` `#ef4444`, `brand-yellow` `#facc15`, `brand-blue` `#2563eb`) | Loader dots and the Student mode switch card only. Never in teacher or admin screens, and not on the landing (tried and reverted). | `tailwind.config.ts` |

### Unused tokens

`mint`, `coral`, and the `accent-teal / amber / coral` tokens are in `tailwind.config.ts` but no longer used
for kinds. Do not use them for new work.

---

## 6. Spacing and layout

### App shell (Built, `app-shell.tsx`)

| Piece | Value |
|---|---|
| Page padding | `px-4 pt-5 pb-24` mobile, `md:px-6`, `lg:px-8 lg:pt-7 lg:pb-10` |
| Content width | `mx-auto max-w-7xl` |
| Sidebar (lg and up) | Floating glass rail, `fixed left-4 top-4 bottom-4`, `w-20`, grows to `w-64` on hover over the page. Page sits at `lg:ml-28`. |
| Sidebar order | Admin (admins only), Content, Activities, Student mode, then Help at the bottom, then the profile menu. Settings is in the profile menu. |
| Mobile nav (below lg) | Glass bar `fixed bottom-2 left-2 right-2`, `rounded-2xl`, icon over label tabs, profile menu pinned right |
| Student mode | `px-2 sm:px-3 lg:px-4`, full width. Logo button `fixed left-4 top-3`. Drawer `w-72` from the left. |

### Spacing scale (Built, Tailwind default 4px steps)

| Use | Most used |
|---|---|
| Gap between items | `gap-2` (8px), `gap-3` (12px), then `gap-1.5`, `gap-4` |
| Card and panel padding | `p-4` or `p-5` (Card default is `p-5`), `p-3` for small tiles, `p-2.5` for material cards |
| Stack spacing | `mt-1` label to hint, `mt-2` title to text, `mt-3` or `mt-4` between blocks, `space-y-4` for forms |
| Page header to content | `mb-6` |

Rule: stick to `1, 1.5, 2, 3, 4, 5, 6` steps. No arbitrary pixel spacing.

### Screen sizes (Built, Tailwind default)

`sm 640`, `md 768`, `lg 1024` (sidebar appears), `xl 1280`.
Card grids: 2 columns from `sm`, 3 to 4 from `lg` or `xl`. Pop-ups: `max-w-md` default, `max-w-2xl` to
`max-w-3xl` for forms and previews. Every page must work at phone width with no sideways scroll.

### Layers (z-index, Built)

| Layer | z |
|---|---|
| Inside a card | `z-10`, `z-20` |
| Sidebar, mobile nav | `z-40` |
| Small menus (profile, player) | `z-50` |
| Score and success pop-ups | `z-[60]` |
| Full-screen player | `z-[80]` |
| Student nav button, drawer | `z-[90]`, `z-[100]` |
| Dropdown menu | `z-[140]` |
| Dialog | `z-[150]` |
| Toasts | `z-[200]` |
| Guide tips | `z-[300]` |

---

## 7. Shapes and depth

### Corner radius

| Size | Class | Used for |
|---|---|---|
| Small | `rounded-lg` (8px) | Icon buttons, menu items, small tiles, upload box |
| Medium | `rounded-xl` (12px) | Buttons, inputs, selects, segmented control, picture wells |
| Large | `rounded-2xl` (16px) | Cards, stat cards, icon tiles, toasts area, guide banner |
| Extra large | `rounded-3xl` (24px) | Dialogs |
| Panel | `rounded-[1.75rem]` (28px) | Sidebar, student drawer, big pop-ups |
| Pill | `rounded-full` | Badges, chips, switches, close buttons |

Built: there are also `rounded-[2rem]`, `[1.5rem]`, `[1.45rem]`, `[1.25rem]`, `[1.2rem]` in older screens.
Rule: use only the six above for new work.

### Shadows

**Built:** one named shadow, `shadow-soft` (`0 14px 35px rgba(37,99,235,0.08)`), plus many custom ones.
The common custom ones, all blue-tinted:

| Use | Value |
|---|---|
| Icon tile | `shadow-[0_10px_24px_rgba(37,99,235,0.12)]` |
| Card hover | `shadow-[0_14px_30px_rgba(37,99,235,0.12)]` |
| Primary button | `0_10px_24px_rgba(37,99,235,0.22)`, hover `0.3` |
| Menu | `shadow-[0_18px_45px_rgba(15,23,42,0.16)]` |
| Dialog | `shadow-[0_30px_80px_rgba(30,64,175,0.28)]` |

**Planned:** add `shadow-lift` (hover) and `shadow-pop` (dialogs) to `tailwind.config.ts`. Until then, reuse
the values above; do not invent new ones.

### Glass surfaces (Built, `globals.css`)

| Class | Look | Used for |
|---|---|---|
| `.glass-panel` | White 78% to 58% gradient, blur 20px, white border, soft blue shadow | `Card`, loading state |
| `.glass-panel-strong` | White 82%, blur 26px, stronger shadow | Sidebar, mobile nav, student drawer |
| `.studio-panel` | White 92%, `blue-100` border | Work areas that need to read clearly |
| Solid card | `rounded-2xl border border-blue-100 bg-[#fff] shadow-sm` | Material and activity cards, menus |
| `.interactive-card` | Hover lifts border and shadow | Stat cards |
| `.clean-scrollbar` | Thin `blue-300` thumb on `blue-50` | Any scroll area |

High contrast mode turns all glass into plain white with a dark border.

---

## 8. Icons

**Built:** `lucide-react` only. No other icon set, no emoji in UI.

| Size | Class | Used for |
|---|---|---|
| 12px | `h-3 w-3` | Inside badges |
| 14px | `h-3.5 w-3.5` | Inline status (Saving, Saved) |
| 16px | `h-4 w-4` | Buttons, menu items, tabs, search (most common) |
| 18px | `h-[18px] w-[18px]` | Icon tiles in banners and settings |
| 20px | `h-5 w-5` | Nav items, file upload |
| 24px | `h-6 w-6` | Page header and stat card tiles, player buttons |
| 28px | `h-7 w-7` | Student nav |

Rules:

- Decorative icons get `aria-hidden="true"`. Icon-only buttons get `aria-label`.
- **Icon tile:** `grid h-12 w-12 place-items-center rounded-2xl border border-white/80 bg-gradient-to-br
  from-white/90 to-blue-50/70 text-blue-600` plus the icon tile shadow. Used by `PageHeader` and `StatCard`.
- **Small tile:** `h-9 w-9 rounded-lg bg-blue-50 text-blue-600` (settings rows), `rounded-xl bg-blue-100
  text-blue-700` (guide banner).

Fixed meanings:

| Thing or action | Icon |
|---|---|
| Content | `BookOpen` |
| Activities | `Shapes` (the pulse `Activity` icon is only for the Admin activity log) |
| Admin | `Shield` |
| Help | `HelpCircle` |
| Settings | `Settings` |
| Student mode | `GraduationCap` |
| Playground | `Puzzle` |
| Gestures | `Hand` |
| PECS | `Image` |
| Lesson link | `BookOpen` |
| Audio / no audio | `Volume2` / `VolumeX` |
| Has video | `PlayCircle` |
| Run activity | `Play` |
| Edit, delete | `Pencil`, `Trash2` |
| Restart, clear | `RotateCcw` |
| Private | `Lock` |
| Close | `X` |
| Correct, wrong | `Check` / `CheckCircle2`, `X` / `XCircle` |
| Loading | `Loader2` with `animate-spin` |
| More actions | `MoreHorizontal` |
| Guide | `Sparkles` |

---

## 9. Components

All in `src/components/` unless noted. Use these before writing new markup.

### Button (`ui/button.tsx`)

| Variant | Look |
|---|---|
| `primary` (default) | Gradient `blue-600` to `indigo-600`, white text, blue shadow |
| `secondary` | White glass, ink text |
| `outline` | `blue-200` border, light glass |
| `ghost` | Text only, white hover |
| `danger` | Solid `red-600` |

| Size | Height |
|---|---|
| `sm` | 36px (`min-h-9`) |
| `md` (default) | 44px (`min-h-11`) |
| `lg` | 48px (`min-h-12`) |
| `icon` | 44 x 44 |

All: `rounded-xl font-semibold`, hover lifts 2px, tap shrinks, disabled at 55% opacity.

Two primaries exist today: the gradient (Button, active nav, run buttons) and flat `blue-600`
(players, guide banner, Student mode, switches). Rule until decided: `<Button>` in teacher and admin screens,
flat `blue-600` in the players and Student mode.

### Forms (`ui/form.tsx`)

`Label`, `Input`, `Textarea`, `Select`, `FieldError`, `FieldHint`.
Inputs: 44px high, `rounded-xl`, white glass, `border-white/90`, hover `blue-200`, focus `blue-400` border
plus `ring-4 ring-blue-100`. Select has a `blue-600` chevron. Inside Content pop-ups add `fieldClass`
(`border-blue-100 bg-[#fff]`) so fields stand out.

Search field: input with `pl-9` and a `Search` icon `h-4 w-4 text-slate-400` at `left-3`.

### Switch (Settings)

`h-7 w-12 rounded-full`, on `blue-600`, off `slate-200`, white knob. `role="switch"`.

### Pop-ups (`ui/dialog.tsx`)

- `Dialog`: centered, `max-w-md` default, `rounded-3xl`, white to light blue gradient, blue glow top right,
  backdrop `bg-slate-900/40` with slight blur. Focus trap, Esc, and backdrop click close it.
- `hideHeader`: keeps the title for screen readers and shows a floating round close button, so the content
  can use `PopupTitle` (big title with badges below).
- Footer buttons sit right: Cancel (`ghost`) then the main action.
- `ConfirmDialog`: yes or no. `tone="danger"` makes the confirm red.
- Anything that locks page scroll must use `lockScroll` / `unlockScroll` from this file.

### Tabs and pickers

| Component | Look | Use |
|---|---|---|
| `UnderlineTabs` | Text tabs, `slate-200` bottom line, sliding `blue-600` underline, optional icon and count | Older screens (Activities library) |
| `PillTabs` | White pill group, icon per tab, optional count, selected is a sliding solid `blue-600` pill | Page sections (Content, Admin) |
| `FilterSelect` (`admin-shared.tsx`) | Select with its name inside ("Status  All") | Admin filters |
| `SegmentedControl` | White pill group, optional icon and count, selected is solid `blue-600` | Small choices and filters under a `PillTabs` bar (PECS / Gestures, media type, linked) |
| `CategoryPills` (`content-shared.tsx`) | One row of pills, extras in "+N more" | Category filter |
| `DropdownMenu` | `⋯` button, white menu 224px wide, danger items red | Row and card actions |
| `SelectionList` | Checkbox rows, selected `border-blue-500 bg-skywash` | Picking cards |
| Slot tray (`MaterialsStep tray="slots"`) | Numbered 3:4 slots that fill in pick order, tap to remove. With `max`: that many slots and a "3 of 5" pill (activity creator). Without: picked cards plus one next slot, wrapping, "Lesson order" (lesson form) | Picking cards in order |

### Badges and chips

| Component | Look |
|---|---|
| `Badge` | `rounded-full bg-skywash px-3 py-1 text-xs font-semibold text-blue-700` |
| `KindBadge` | PECS or Gesture, in its thing color, with icon |
| `ActivityTypeBadge` | Activity type, in its type pastel |
| `CategoryChip` | `bg-slate-50` pill with a colored dot |
| Private chip | `bg-slate-100 text-slate-600` with `Lock` |

### Page parts

| Component | Look |
|---|---|
| `PageHeader` (`layout/`) | Blue icon tile plus big page name, actions on the right. **No band or box.** Blue only, no per-page colors. |
| `StatCard` (`common/`) | Label, `text-3xl` number, icon tile right |
| `EmptyState` (`common/`) | Card with a floating icon tile, title, one line |
| `LoadingScreen` / `LoadingState` (`common/`) | Cropped logo that bobs, three hopping dots (red, yellow, blue), one short line. Full screen / in page. |
| Student mode switch (`student-mode-transition.tsx`) | ~1s solid blue card: logo, "Student mode" or "Teacher view", brand shapes |
| Toast (`common/toast-provider.tsx`) | Glass card, meaning-color left stripe, icon tile, timer bar. Bottom right (top on phones), 3 seconds, hover pauses. |
| `FileUpload` (`ui/`) | Dashed `blue-200` box, icon tile, Choose or Change, limit shown in the hint |
| Guide banner (`features/guide/`) | Light blue glass strip, `Sparkles` tile, one line, blue "Show me", close `X` |
| Settings group | Card with an uppercase group heading, white list with `blue-100` dividers, icon tile rows |

### Cards

| Card | Anatomy |
|---|---|
| Material (`content/card-tile.tsx`, picture only: name, audio, category show when opened) | Whole card in the thing's soft color and border, 6px stripe on top, white 3:4 picture box (`PictureBox`), word in `text-sm font-bold` (2 lines max), audio icon, category chip. No PECS / Gesture badge, no video. Hover: lift 2px. |
| Lesson (`content/lesson-card.tsx`) | Full-width row, 6px blue stripe on the left, title, one-line description, meta line (cards, Private, By name), numbered 3:4 card strip on the right (5 then "+N") |
| Activity (`activities/activity-card.tsx`) | Solid white card, type-color stripe, picture collage, one-line title `text-lg font-bold`, one meta line (type badge, card count, lock if private, By name), lesson name and Play at the bottom |
| PECS picture | 3:4, word at the bottom, image `object-contain`. Use `PictureBox` (`content-media.tsx`): an image in a plain grid cell keeps its own height and the word gets cut off. |

---

## 10. Student mode and players

| Piece | Look |
|---|---|
| Targets | 56px+ high (`min-h-14`), `rounded-2xl` |
| Text | `text-base` to `text-lg`, `font-black`, dark blue `#10285e` for messages |
| Check | `bg-[#50c819]` green, 4px white border, solid bottom shadow, `CheckCircle2` |
| Next | `bg-blue-600`, same shape, `ChevronRight` |
| Back | White, `border-2 border-blue-200`, blue text |
| Playground buttons | Check `emerald-600`, Listen `blue-600`, Clear `red-600`, solid, disabled when the board is empty |
| Answer states | Picked: `border-blue-500 ring-8 ring-blue-100`. Correct: emerald border and ring plus green tick badge. Wrong: rose border and ring plus red cross badge. Hint: amber. Others fade to 60%. |
| Flow (teacher player) | Pick, Check, Next. Score pop-up opens by itself 1.2s after the last Check. |
| Player top bar | White glass bar, title `text-lg font-extrabold`, type badge, "2 of 5 done" solid blue pill, Restart and Edit joined in one white control |

**Student mode games** (one scale for every game, in `player/student-theme.ts`):

| Piece | Look |
|---|---|
| Instruction line | `text-xl sm:text-2xl font-black text-blue-700`, white strip under the top bar |
| Question, word, sentence | `text-3xl sm:text-4xl lg:text-5xl font-black text-[#10285e]` |
| Drop box word | `text-xl sm:text-2xl font-black uppercase` |
| Card | `studentCard`: 3:4, `border-4`, solid white, max `16rem` wide, same in every game and the score pop-up |
| Buttons | `studentButton`: primary `blue-600`, secondary white with blue border, Hint white with amber border |
| Instruction wording | "Find the picture..." (`studentInstruction`), not "Tap the...". Drag and drop: "Drag each picture onto its word." |
| How to play card | Title, then the demo in its own light panel, then the instruction in a solid blue box, then Listen and Start, then "Don't show this again" (per activity, this browser) |
| Flow | One tap per question. Right: big "Correct!" pop-up, next after 1.8s. Wrong: no pop-up, the cards shake, the pick is tagged "Not this one" in red, and the right card grows and glows with "This one!", next after 2.4s. Drag and drop: drag only, a wrong drop shakes the box and flies back. |
| Drag and drop score | Placed cards are always green in the progress. Score counts first drops ("3 of 4 right"); a card that needed another try gets an amber turn arrow, not a red cross |
| Hint | Greys out one wrong card per tap, stops at two cards left |
| Solid white | Use `bg-[#fff]`, not `bg-white`: `.app-canvas .bg-white` is 70% glass |

Student pieces: `student-game-parts.tsx` (frame, top bar, progress dots, card, feedback pop-up), `student-intro-card.tsx`.

---

## 11. Motion

**Built**

| Motion | Where | Value |
|---|---|---|
| Page change | `PageTransition` | Fade and rise 14px, 0.45s, ease `[0.22, 1, 0.36, 1]` |
| Scroll reveal | `Reveal` (landing) | Rise 28px, 0.58s, once |
| Button hover / tap | `Button` | Up 2px and scale 1.015 / scale 0.975, spring |
| Card hover | `Card`, material and activity cards | Up 2px |
| Pop-up open | `Dialog` | Backdrop fade 0.15s, panel rise 12px and scale 0.98, 0.18s |
| Tab underline | `UnderlineTabs` | Slides, spring |
| Toast | Toast provider | Rises in, slides out right, 0.22s; timer bar shrinks |
| Grid entrance | `.stagger-grid` | Cards rise one after another, 70ms apart |
| Result | `.activity-result-panel` | Pop; wrong answers also shake |
| Celebration | `.activity-confetti` | 18 pieces fall |
| Background | `.app-canvas` | Two faint blobs drift slowly |

Rules:

- Reuse the ease `[0.22, 1, 0.36, 1]`. Keep UI motion under 0.5s.
- Every Framer Motion animation checks `useReducedMotion()`. CSS animations are switched off by the
  `prefers-reduced-motion` rule and the `.reduce-motion` class.
- Motion supports meaning (open, correct, wrong). No decorative loops in teacher screens.

---

## 12. Accessibility and Settings

Built settings (applied as classes on `<html>` by `user-settings-context.tsx`):

| Setting | Class | Effect |
|---|---|---|
| Text size Large / Extra large | `.large-text` / `.extra-large-text` | Root font 112.5% / 125% |
| High contrast | `.high-contrast` | White background, dark text, no glass or shadows, dark borders |
| Reduce motion | `.reduce-motion` | All animations and transitions off |

Rules:

- Touch targets 44px in the app, 56px in Student mode.
- Visible focus on everything: global 3px blue outline, or `focus-visible:ring-2 ring-blue-300` on custom
  controls.
- Text contrast 4.5:1. Never rely on color alone: pair with an icon or word (tick, cross, "Private").
- Use sizes in `rem` (Tailwind classes) so Large text works.

---

## 13. Copy

- Short: a label plus a short phrase. One sentence at most.
- No em dashes. Use a comma, colon, period, or parentheses.
- Sentence case for buttons and titles ("Add PECS card", not "Add PECS Card").
- Say what happened ("File deleted", "Could not save"), never a false success.
- Names: PECS cards, Gestures, Lessons, Activities, Student mode, Playground. Activity types in teacher
  screens use the short names (`activityTypeShortLabels` in `src/utils/activity-labels.ts`): Match, Choose the
  picture, Fill in the blank, Drag and drop. The full names (`activityTypeLabels`) stay for AI prompts.
- Default activity names: topic, type, then "activity", for example "Feelings match activity". The topic is
  the lesson, else the cards' main category, else the first card (`src/utils/activity-title.ts`).

---

## 14. Known inconsistencies (fix when you touch the code)

| Issue | Target |
|---|---|
| Font is not downloaded | Plus Jakarta Sans (section 3) |
| 12 text sizes plus 8 to 11px custom sizes | Scale in section 4 |
| 17 color families, 61 raw hex values | Base, meaning, and thing colors only |
| Green split across emerald, green, lime; red across red, rose | emerald, amber, red |
| Two primary button styles | Decide one (section 9) |
| 86 custom shadows | Values in section 7, then named shadows |
| 10 custom corner sizes | Six sizes in section 7 |

---

## 15. Checklist before shipping a screen

- [ ] Uses existing components (`Button`, `Dialog`, `PageHeader`, `UnderlineTabs`, form parts)
- [ ] Text sizes from section 4, nothing new under 12px, weights 400 / 600 / 700 / 800
- [ ] Blue for action, ink for text, meaning colors only for meaning
- [ ] PECS, Gestures, Lessons, Activities colors from `entity-colors.ts`
- [ ] Grey text is `slate-500` or darker
- [ ] Radius and shadow from section 7
- [ ] lucide icons at the sizes in section 8, with `aria-hidden` or `aria-label`
- [ ] Works on a phone, with Large text, High contrast, and Reduce motion
- [ ] Short copy, no em dashes

---

## 16. Where things live

| What | File |
|---|---|
| Colors, fonts, glass, animations, settings classes | `src/app/globals.css` |
| Tailwind tokens (`ink`, `primary`, `skywash`, `shadow-soft`) | `tailwind.config.ts` |
| Thing colors | `src/lib/entity-colors.ts` |
| Buttons, forms, dialog, tabs, menus, badges | `src/components/ui/` |
| Shell, sidebar, mobile nav, page header, logo | `src/components/layout/` |
| Stat card, empty, loading, toasts | `src/components/common/` |
| Page and scroll motion | `src/components/motion/` |
| Content shared parts (badges, chips, pills, popup title) | `src/features/content/content-shared.tsx` |
| Activity type colors | `src/features/activities/activity-helpers.ts` |
| Player parts | `src/features/activities/player/player-parts.tsx` |
| Playground colors | `src/features/playground/playground-view.tsx` |
| Logo | `public/makalearn_logo_current.png` (landing, login); cropped `makalearn_logo_mark.png` in `BrandLogo` and loaders |
