# MakaLearn Design System & UI Reference

A snapshot of how the MakaLearn interface is currently built: tokens, primitives, layout
rules, motion, and accessibility. Written as a baseline to improve against, each section
ends with the known gaps worth fixing.

Stack: Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS 3.4 · Framer Motion 11 · lucide-react icons.

---

## 1. Design language

The look is **soft glassmorphism on a light blue academic canvas**. Frosted white panels
float over an animated gradient mesh; blue-to-indigo gradients mark anything primary or
active; corners are generously rounded (`rounded-xl` → `rounded-[1.75rem]`); shadows are
wide, soft and blue-tinted rather than neutral grey.

Three tone registers coexist:

| Register | Where | Characteristics |
|---|---|---|
| **Marketing** | `/` landing, `/login` | Decorative orbs, ribbons, dot fields, 3D-tilted device mock, scroll reveals |
| **Teacher app** | Content, Activities, Settings, Admin, Help | Sidebar shell, glass cards, dense forms, stat cards, `text-sm` base |
| **Student mode** | Playground, Gesture practice, Activity player | Full-bleed, large hit targets (min 3.5–4rem), `font-black`, celebratory feedback (confetti, shake) |

---

## 2. Color tokens

### CSS variables: `src/app/globals.css`

```css
--background:   216 60% 97%;            /* HSL triplets, consumed via hsl(var(--x)) */
--foreground:   222 47% 11%;
--border:       215 42% 86%;
--panel:        rgba(255,255,255,0.72);
--panel-soft:   rgba(246,250,255,0.68);
--blue-ink:     #1e4fc7;
--focus:        rgba(37,99,235,0.18);
--glass-border: rgba(255,255,255,0.76);
--glass-shadow: 0 22px 58px rgba(30,64,175,0.11);
```

### Tailwind theme: `tailwind.config.ts`

| Token | Value | Use |
|---|---|---|
| `primary` | `#2563eb` (fg `#ffffff`) | Primary actions, active nav |
| `ink` | `#172033` | Body and heading text |
| `skywash` | `#eef7ff` | Badge / chip background |
| `mint` | `#e8f7ef` | Success surfaces |
| `coral` | `#fff1ec` | Warning / attention surfaces |
| `accent-teal` / `-soft` | `#0f766e` / `#ccfbf1` | Accent tile, icon, step marker |
| `accent-amber` / `-soft` | `#b45309` / `#fef3c7` | Accent tile, icon, step marker |
| `accent-coral` / `-soft` | `#be123c` / `#ffe4e6` | Accent tile, icon, step marker |
| `shadow-soft` | `0 14px 35px rgba(37,99,235,0.08)` | Default card elevation |

Blue carries every primary action, the nav, and the CTA band. The accent family adds warmth
on illustrations, icon tiles, and step markers only. The `ink` values clear 4.5:1 on white
glass; the `-soft` values are fills.

### Body background

Three radial gradients (cyan 16%, indigo 14%, blue 13%) layered over a
`135deg` linear gradient `#f8fbff → #eef4ff → #f4fbff`, with `background-attachment: fixed`.

### Semantic colors in practice

Not tokenized, components reach for raw Tailwind palette values directly:
`blue-600`/`indigo-600` (primary gradient), `slate-600` (secondary text), `slate-500`
(tertiary/labels), `red-600` (destructive/errors), `emerald`/`amber`/`rose` (feedback states),
confetti `#facc15 · #38bdf8 · #34d399 · #fb7185`.

**Gap:** `mint` and `coral` are defined but barely used; success/warning/error have no
tokens, so semantic color is inconsistent across ~10k lines of feature code. There is also
no dark theme, a `theme` setting exists in Settings but only offers `high-contrast`.

---

## 3. Typography

```css
font-family: "Aptos", "Avenir Next", "Segoe UI Variable", "Segoe UI", sans-serif;
font-feature-settings: "ss01" 1, "cv02" 1;
letter-spacing: -0.008em;
```

No webfont is loaded, this is a system-font stack, so rendering differs across OSes
(Aptos ships with Microsoft 365; macOS falls back to Avenir Next; Linux to generic sans).

| Role | Classes |
|---|---|
| Page title (`PageHeader`) | `text-3xl md:text-4xl font-extrabold tracking-[-0.035em] text-ink` |
| Eyebrow | `text-xs font-extrabold uppercase tracking-[0.14em] text-blue-700` |
| Card title | `text-lg font-semibold text-ink` |
| Body / description | `text-sm leading-6 text-slate-600` (header lead: `text-base leading-7`) |
| Labels | `text-sm font-semibold text-slate-700` |
| Hints | `text-xs leading-5 text-slate-500` |
| Student nav | `text-lg font-black` |

**Gap:** no defined type scale, sizes are chosen per component. `.large-text` bumps the
root to `112.5%`, and since sizes are `rem`-based Tailwind utilities they do scale with it.

---

## 4. Surfaces & elevation

Three glass utilities in `globals.css`:

- **`.glass-panel`**: `linear-gradient(145deg, rgba(255,255,255,.78), rgba(246,250,255,.58))`,
  `backdrop-filter: blur(20px) saturate(145%)`, `--glass-shadow` plus a 1px white inset
  highlight. Used by `Card` and `PageHeader`.
- **`.glass-panel-strong`**: `rgba(255,255,255,.82)`, `blur(26px) saturate(150%)`,
  `0 26px 70px rgba(30,64,175,.14)`. Used by Sidebar, MobileNav, student drawer.
- **`.studio-panel`**: opaque `rgba(255,255,255,.92)` with a solid `#dbeafe` border, for
  camera/gesture surfaces where blur would hurt legibility.

`.app-canvas .bg-white` is globally overridden to `rgba(255,255,255,0.7)` + blur, so any
plain `bg-white` inside the app shell silently becomes glass.

`.interactive-card` adds a 240ms hover transition to a blue border and a deeper shadow.

**Gap:** stacked `backdrop-filter` is a real paint cost on low-end classroom hardware, and
there is no elevation scale, shadows are bespoke arbitrary values in about a dozen places.

---

## 5. Component primitives (`src/components/`)

### `ui/button.tsx`
Motion button. Variants: `primary` (blue→indigo gradient + glow), `secondary` (white/65
glass), `outline`, `ghost`, `danger` (solid `red-600`). Sizes: `sm` 36px · `md` 44px ·
`lg` 48px · `icon` 44×44. Hover `y:-2, scale:1.015`, tap `scale:0.975`, spring
`stiffness 430 / damping 28`: all suppressed under `useReducedMotion()` or `disabled`.

### `ui/card.tsx`
`Card` (glass, `rounded-2xl`, `p-5`, hover lift `y:-2`), plus `CardTitle`,
`CardDescription`, `CardFooter`.

### `ui/badge.tsx`
Pill: `bg-skywash text-blue-700 text-xs font-semibold`. Single variant only.

### `ui/form.tsx`
`Label`, `Input`, `Textarea`, `Select`, `FieldError`, `FieldHint`. Inputs: 44px min height,
`rounded-xl`, translucent white, with a rich focus state, `border-blue-400`, `bg-white/90`,
`ring-4 ring-blue-100` and a blue glow. `Select` renders a custom `ChevronDown` over an
`appearance-none` native select.

### `layout/`
- `app-shell.tsx`: auth gate → student-mode routing guard → `Sidebar` + `main` + `MobileNav`, wrapped in `ToastProvider` / `AuthProvider` / `StudentModeProvider` with a pathname-keyed `PageTransition`.
- `sidebar.tsx`: fixed floating rail, `w-64`, inset `1rem`, `rounded-[1.75rem]`, `lg:` only.
- `mobile-nav.tsx`: fixed bottom bar, horizontally scrollable, `lg:hidden`, 56px items.
- `page-header.tsx`: glass header with eyebrow / title / description and an optional actions rail that sits right on `lg`, stacked below elsewhere.
- `brand-logo.tsx`: 64px rounded mark wrapping `/makalearn_logo_current.png`.

### `common/`
`StatCard` (label + 3xl value + gradient icon tile), `EmptyState` (animated 3D floating-card
illustration), `LoadingState` (pulsing skeleton with `aria-live="polite"`), `ToastProvider`.

### `motion/`
`PageTransition` (fade + 14px rise, 450ms), `Reveal` (scroll-triggered, `once`, 22% threshold),
`AmbientShapes`, `LearningScene` (three.js / react-three-fiber).

**Gap:** no `Dialog`, `Tabs`, `Tooltip`, `Table`, or `Switch` primitive, feature files
hand-roll these, which is a major reason the view components run 1,300–2,600 lines.
`Badge` has no semantic variants.

---

## 6. Layout & responsive

**Breakpoints:** stock Tailwind, `sm 640` · `md 768` · `lg 1024` · `xl 1280`.
`lg` is the pivot: sidebar appears, bottom nav disappears.

**Teacher shell main:**
`px-4 pb-24 pt-5 md:px-6 lg:ml-72 lg:px-8 lg:pb-10 lg:pt-7`, content capped at `max-w-7xl`.
The `pb-24` clears the mobile bottom nav; `lg:ml-72` clears the 256px sidebar plus its inset.

**Student shell main:** `px-2 pb-2 sm:px-3 lg:px-4`, `pt-20` for the floating logo button
(`pt-2` on gesture practice), `max-w-none`: deliberately full-bleed.

**Grids:** `.stagger-grid` gives children a `card-rise` entrance with 70ms cascading delays,
capped at 340ms from the 6th child onward.

**Gap:** no spacing scale beyond Tailwind defaults; the `lg:ml-72` / `w-64` sidebar
relationship is a magic-number pair that breaks silently if either side changes.

---

## 7. Motion

| Animation | Duration / easing | Purpose |
|---|---|---|
| `card-rise` | 560ms `cubic-bezier(.22,1,.36,1)` | Grid item entrance |
| `ambient-drift` | 16s / 19s alternate | Background orbs |
| `mesh-drift` | 14s alternate | Hero mesh |
| `cue-float` | 6s | Floating landing cues |
| `camera-breathe` | 2.8s | Live-camera ring pulse |
| `result-pop` / `result-shake` | 380ms / 420ms | Correct vs. wrong answer |
| `confetti-drop` | 920ms, 18 staggered pieces | Correct-answer celebration |
| `wrong-mark-pulse` | 900ms | Incorrect-answer emphasis |

Standard easing is `cubic-bezier(0.22, 1, 0.36, 1)`; page and reveal transitions run
450–760ms, micro-interactions 240–380ms.

Scroll reveals go through the `Reveal` component (Framer Motion `whileInView`), which works
in every browser and honors `useReducedMotion()`. The Chromium-only `.reveal-on-scroll` /
`animation-timeline: view()` utility was removed during the landing page rebuild.

**Gap:** durations are on the long side for repeated teacher workflows.

---

## 8. Accessibility

**Implemented:**
- Global `*:focus-visible` → `3px solid rgba(37,99,235,.18)`, `outline-offset: 2px`.
- `@media (prefers-reduced-motion: reduce)` neutralizes all animation/transition durations.
- `useReducedMotion()` guards every Framer Motion hover/tap/loop.
- Three user toggles in Settings, applied as root classes and persisted:
  `.large-text` (root 112.5%), `.high-contrast` (white surfaces, `#0f172a` borders, no
  blur or shadow), `.reduce-motion`.
- Touch targets ≥ 44px app-wide, ≥ 56px in student mode.
- `aria-hidden` on decorative icons, `aria-label` on icon-only buttons, `aria-expanded` on
  the student nav trigger, `aria-live="polite"` on loading, `sr-only` labels.
- `.clean-scrollbar` styles scrollbars in both Firefox and WebKit syntaxes.

**Gaps to verify:**
- `text-slate-500` on translucent glass is likely under 4.5:1, contrast needs auditing
  across all glass surfaces.
- `.high-contrast` only overrides panels and form controls; gradient buttons, badges and
  active nav items keep their original colors.
- Modals and drawers are hand-rolled without focus trapping or `Escape` handling.
- No skip-to-content link; heading order is not enforced.

---

## 9. Where things live

```
src/app/globals.css          Tokens, glass utilities, keyframes, a11y classes
tailwind.config.ts           Color/shadow theme extension
src/components/ui/           Button, Card, Badge, Form, FileUpload, SelectionList
src/components/layout/       AppShell, Sidebar, MobileNav, PageHeader, BrandLogo, nav-items
src/components/common/       StatCard, EmptyState, LoadingState, ToastProvider
src/components/motion/       PageTransition, Reveal, AmbientShapes, LearningScene
src/components/landing/      Landing-page sections, SVG signing kids, doodle accents
src/features/<domain>/       Page-level views (the bulk of the UI code)
```

---

## 10. Suggested improvement order

1. **Tokenize semantics**: add `success` / `warning` / `danger` / `info` surface, text and
   border tokens so feature code stops picking raw palette values.
2. **Extract missing primitives**: `Dialog` (with focus trap), `Tabs`, `Switch`, `Table`,
   `Tooltip`. This is the single biggest lever on the oversized view files.
3. **Define scales**: a type scale and an elevation scale (`shadow-1..4`) to replace
   arbitrary shadow values.
4. **Contrast audit**: check every `slate-500`/`slate-600` on glass, and extend
   `.high-contrast` to buttons, badges and active nav.
5. **Performance**: measure stacked `backdrop-filter` cost on target classroom hardware;
   consider dropping blur on the largest surfaces.
6. **Badge variants**: semantic variants, once step 1 lands.
7. **Dark theme**: the `theme` setting already exists in Settings but offers no dark option.
