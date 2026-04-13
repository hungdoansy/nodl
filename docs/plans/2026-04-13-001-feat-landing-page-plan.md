---
title: "feat: Landing page for nodl desktop app"
type: feat
status: active
date: 2026-04-13
---

# feat: Landing page for nodl desktop app

## Overview

Replace the placeholder `apps/web/` landing page with a polished, production-grade marketing
site for nodl. The page showcases what the app does (instant inline JS/TS execution), how it
feels (warm neutral dark IDE aesthetic), and drives one primary action: download the DMG from
GitHub Releases.

The design mirrors the desktop app's visual language for brand coherence — same palette,
same accent, same monospace — and borrows modern dark-site motion patterns from the
Aceternity / 21st.dev background collections (grid fades, spotlight, subtle beams) to make
the hero feel distinct without drifting from the app's identity.

## Problem Frame

The current landing page (`apps/web/src/app/page.tsx`) is a single centered `<h1>` with an
inline-styled purple button. It does not:
- Explain what nodl does or who it's for
- Show the product visually
- Establish brand identity consistent with the desktop app
- Convey quality signals that match a v2.1.0 polished IDE-class tool

A new visitor landing on the current page cannot tell nodl apart from a scaffolded Next.js
starter. We need a landing page that does the product justice and converts curious visitors
into DMG downloaders.

## Requirements Trace

- **R1.** Communicate nodl's value proposition in < 5 seconds of scrolling (tagline + hero visual).
- **R2.** Make the primary conversion — "Download for macOS" linking to latest GitHub Release — unmissable and reachable in one click from any scroll position.
- **R3.** Visual language must feel like the desktop app: same palette (`#171717` → `#2d2d2d` backgrounds, `#a78bfa` accent), JetBrains Mono for code, system font for UI, same border/shadow conventions.
- **R4.** Showcase the core features: inline output, TS support, npm packages, multi-tab, keyboard shortcuts, auto-run.
- **R5.** Demonstrate the "write code → see output inline" experience visually (screenshot / video / animated mock).
- **R6.** Responsive — readable on mobile, polished on desktop. Primary target is desktop since that's where people decide to download desktop apps.
- **R7.** Build output must remain a static export (`next.config.ts` already sets `output: 'export'`) so it can deploy to any static host (GitHub Pages, Netlify, Vercel static).
- **R8.** Placeholders for all visual assets the author will supply later (screenshots, short demo clip, OG image). The page must render cleanly with placeholders in place.

## Scope Boundaries

- **In scope:** Single marketing landing page at `/`, all visual design + motion, responsive layout, Tailwind + design-token setup mirroring desktop app, dark theme only.
- **Out of scope (not this plan):**
  - Light theme toggle (desktop has one, but web stays dark-only for now — simpler brand story)
  - Blog, changelog page, docs page (the About dialog in the app handles changelog)
  - Analytics / tracking
  - i18n
  - Interactive in-browser REPL playground
  - Windows / Linux binaries (only macOS DMG exists today; download CTA reflects that)

### Deferred to Separate Tasks

- **Supplying visual assets** (product screenshots, short demo clip, OG image, favicon): placeholders land with this plan; the author provides final files after merge.
- **Hosting / DNS**: a separate ops task; the plan just keeps the static export clean.

## Context & Research

### Relevant Code and Patterns

- `apps/desktop/src/index.css` — **The authoritative design system.** Every CSS variable, radius, shadow, ease curve, animation keyframe, and component class (`btn`, `btn-primary`, `toolbar-btn`) comes from here. The web app's `globals.css` should re-declare the same tokens (dark theme only).
- `apps/desktop/src/components/Header/Header.tsx` and `apps/desktop/src/components/Editor/EditorPane.tsx` — reference for how the app actually looks, to make the hero product mockup feel authentic (even if it's a screenshot, supporting UI chrome on the landing site should match).
- `apps/web/next.config.ts` — already configured for static export. Do not change.
- `apps/desktop/package.json` — source of truth for app version (`2.1.0`) and description. Consider pulling this via `import { version } from '../../desktop/package.json'` so the site auto-updates on release (Next can JSON-import at build time).
- `apps/desktop/CHANGELOG.md` — not displayed on the site (the About dialog handles that), but referenced in `Sources` section for author context.

### External References (Inspiration)

- **Aceternity UI** (aceternity.com/components) — Spotlight, Grid Backgrounds, Beams, Meteors, Sparkles, Glowing Stars. Pick at most **one** hero effect; layering looks AI-generated.
- **21st.dev** background collection — similar family, prefer subtle/minimal variants.
- **Reference feel:** Linear, Raycast, Zed, Codex. Understated, heavy negative space, one strong accent, monospace flourishes.

### Institutional Learnings

- From project CLAUDE.md: "Warm neutral dark theme. Not blue-tinted, not sci-fi. Reference aesthetic: Codex/OpenAI UI." The landing page must honor this — no cyberpunk grids, no neon.
- From project CLAUDE.md: system font for UI, JetBrains Mono for code only. Same rule applies on the landing page — do not set monospace globally.

## Key Technical Decisions

- **Add Tailwind v3 + PostCSS to `apps/web/`**, matching desktop app's Tailwind 3 version. Rationale: design-heavy work with many utility classes is far faster in Tailwind than bespoke CSS, and we stay on the same major the team already knows. Configure `tailwind.config.ts` with the desktop app's token names so `bg-void`, `text-secondary`, `border-subtle`, `accent`, etc. are first-class utilities.
- **Add Framer Motion** for scroll reveals and hero motion. Rationale: the visual bar the user asked for (Aceternity-level polish) requires motion, and Framer Motion is the de-facto standard. One dependency buys hero/section animations without reinventing them.
- **Add `lucide-react`** — same icon set the desktop app uses, keeps visual vocabulary consistent across the two surfaces.
- **Load JetBrains Mono via `next/font/google`** — zero CLS, offline at build, no external font request at runtime. Load system-ui implicitly for UI text (no extra font needed).
- **Pick one hero background effect** — a fading grid + soft violet radial glow behind the headline. Rejected: spotlight-that-follows-mouse (feels gimmicky on landing pages now), meteors (too sci-fi), sparkles (doesn't match warm-neutral brand).
- **Product preview is a real screenshot** (placeholder for now) framed inside an inline "macOS window chrome" mockup rendered in CSS, not an animated fake. Rationale: authenticity > cleverness; a real screenshot tells a truer story than a stylized mock.
- **Keep the page a single server-rendered RSC** with small `"use client"` islands only where motion or intersection observers are needed (hero background, scroll-reveal wrappers). Rationale: smaller bundle, better LCP.
- **Dark theme only** on web — no toggle. Rationale: brand consistency, simpler maintenance, matches the "pro tool" positioning.
- **Download CTA points to `https://github.com/hungdoansy/nodl/releases/latest`** rather than a hardcoded version URL, so the button never goes stale between releases.

## Open Questions

### Resolved During Planning

- **Tailwind or bespoke CSS?** Tailwind v3 — matches desktop, fastest iteration.
- **Motion library?** Framer Motion — one dep, covers everything needed.
- **Do we ship a light theme?** No, dark-only for v1 of the site.
- **Where to put section components?** `apps/web/src/components/` (new directory), grouped flat since it's a single page.

### Deferred to Implementation

- **Exact copy** for hero tagline, feature blurbs, section headers. The plan includes draft copy in each unit but final wording is a design-and-taste call made while building.
- **Which single hero effect** renders best behind the real headline text and product screenshot — evaluated visually during the build against the actual product screenshot once the author supplies it.
- **Whether the "How it works" section is a static 3-column grid or a subtle animated timeline** — decide by feel during build; both work with the surrounding design.

## Output Structure

    apps/web/
    ├── public/
    │   ├── favicon.svg                    (placeholder — author supplies)
    │   ├── og-image.png                   (placeholder — author supplies)
    │   └── screenshots/
    │       ├── hero-product.png           (placeholder — author supplies)
    │       ├── feature-inline-output.png  (placeholder — author supplies)
    │       ├── feature-packages.png       (placeholder — author supplies)
    │       └── demo.mp4                   (placeholder — author supplies, optional)
    ├── src/
    │   ├── app/
    │   │   ├── layout.tsx                 (modified)
    │   │   ├── page.tsx                   (rewritten — composes sections)
    │   │   └── globals.css                (new — tailwind + design tokens)
    │   ├── components/
    │   │   ├── Header.tsx                 (new)
    │   │   ├── Hero.tsx                   (new)
    │   │   ├── ProductPreview.tsx         (new)
    │   │   ├── Features.tsx               (new)
    │   │   ├── HowItWorks.tsx             (new)
    │   │   ├── CodeShowcase.tsx           (new)
    │   │   ├── DownloadSection.tsx        (new)
    │   │   ├── Footer.tsx                 (new)
    │   │   ├── WindowChrome.tsx           (new — macOS-style frame around screenshots)
    │   │   └── effects/
    │   │       ├── GridBackground.tsx     (new — fading grid)
    │   │       └── RadialGlow.tsx         (new — soft violet glow)
    │   └── lib/
    │       └── constants.ts               (new — download URL, version, feature copy)
    ├── tailwind.config.ts                 (new)
    ├── postcss.config.js                  (new)
    └── package.json                       (modified — add tailwind, framer-motion, lucide-react)

## High-Level Technical Design

> *This illustrates the intended section composition and is directional guidance for review,
> not implementation specification. The implementing agent should treat it as context, not
> code to reproduce.*

Page composition from top to bottom:

```
┌─ <Header>                                            sticky, translucent, blur
│   logo ── nav (Features, GitHub) ── Download CTA
├─ <Hero>                                              min-h ~85vh
│   └─ <GridBackground> + <RadialGlow>                 background layer, absolute
│   └─ headline (big, serif-less, tight tracking)
│   └─ subhead (text-secondary, 18–20px)
│   └─ primary CTA (Download .dmg) + secondary (GitHub)
│   └─ optional: keyboard hint row (⌘⏎ to run)
├─ <ProductPreview>                                    negative top-margin into hero
│   └─ <WindowChrome>                                  macOS traffic lights + title
│       └─ <img> hero-product.png (placeholder)
├─ <Features>                                          3x2 grid, icon + title + blurb
├─ <HowItWorks>                                        3-step explainer with monospace
│                                                      code fragments on each step
├─ <CodeShowcase>                                      side-by-side: code block / output
│                                                      styled to match desktop app exactly
├─ <DownloadSection>                                   final conversion push
│   └─ big button, version string, system requirements
└─ <Footer>                                            author, license, source, issues
```

Section interaction + motion pattern (client islands only):
- Hero background fades grid toward edges via CSS radial-mask; glow is a blurred violet disc
- Each section below the fold uses `framer-motion`'s `whileInView` with `opacity 0→1` and
  `y: 12→0`, `once: true`. Keep durations 400–600ms, no bouncy easing.
- Do not animate the header, product preview, or footer — they should feel solid.

## Implementation Units

- [ ] **Unit 1: Project setup — Tailwind, fonts, design tokens, deps**

**Goal:** Install Tailwind v3, PostCSS, Framer Motion, lucide-react in `apps/web/`;
configure Tailwind to expose desktop-app tokens as utilities; load JetBrains Mono via
`next/font/google`; create `globals.css` carrying the full token set from the desktop app's
`index.css` (dark theme only). After this unit, no visual change to the page, but the design
system is callable from any component.

**Requirements:** R3, R7.

**Dependencies:** None.

**Files:**
- Modify: `apps/web/package.json`
- Create: `apps/web/tailwind.config.ts`
- Create: `apps/web/postcss.config.js`
- Create: `apps/web/src/app/globals.css`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/src/lib/constants.ts`

**Approach:**
- Mirror desktop's Tailwind 3 major version exactly to avoid surprises.
- Extend `theme.colors` with semantic tokens (`bg-void`, `bg-primary`, `bg-surface`,
  `bg-elevated`, `border-subtle`, `border-default`, `border-strong`, `accent`,
  `accent-bright`, `text-primary`, `text-secondary`, `text-tertiary`, `text-bright`,
  `danger`, `warn`, `info`, `ok`). Also add `fontFamily.mono` → JetBrains Mono var,
  `fontFamily.sans` → system UI stack.
- `globals.css` holds `@tailwind` directives, the same `:root` CSS variables from desktop,
  the same scrollbar treatment, and the same `@keyframes` (fadeIn, slideDown). No
  `.light` block — dark only.
- `layout.tsx` imports `globals.css`, loads JetBrains Mono via `next/font/google` and exposes
  it as a CSS variable on `<html>`. Update `<html lang>`, `<body className>`, and refresh
  metadata (title, description, OG tags, favicon link).
- `lib/constants.ts` exports: `DOWNLOAD_URL = 'https://github.com/hungdoansy/nodl/releases/latest'`,
  `GITHUB_URL = 'https://github.com/hungdoansy/nodl'`, `APP_VERSION` imported from desktop
  `package.json` via `import desktopPkg from '../../../desktop/package.json'` (works with
  Next's default JSON import + static export), and the feature copy array used by `<Features>`.

**Patterns to follow:**
- Token names + values from `apps/desktop/src/index.css` (`:root` block, lines 10–55).
- `metadata` pattern from existing `apps/web/src/app/layout.tsx`.

**Test scenarios:**
- **Test expectation: none** — this unit is configuration + design-system scaffolding with no
  behavior to assert. Verification is visual (Tailwind utilities resolve, fonts load, no
  build errors) rather than testable logic. Later units carry the behavioral scenarios.

**Verification:**
- `pnpm run dev` in `apps/web/` starts without errors.
- A throwaway `<div className="bg-void text-accent font-mono">` in `page.tsx` renders with
  the expected colors and font (remove after confirming).
- `pnpm run build` in `apps/web/` produces a static export in `apps/web/out/`.

---

- [ ] **Unit 2: Shared primitives — WindowChrome, GridBackground, RadialGlow**

**Goal:** Build the three reusable visual primitives that multiple sections depend on: a
macOS-style window frame component for wrapping screenshots, a fading grid background
component for the hero, and a radial glow component for the accent glow behind hero content.
These are the building blocks other units compose; isolate them first so sections can be
built in parallel without stepping on each other.

**Requirements:** R3, R5.

**Dependencies:** Unit 1.

**Files:**
- Create: `apps/web/src/components/WindowChrome.tsx`
- Create: `apps/web/src/components/effects/GridBackground.tsx`
- Create: `apps/web/src/components/effects/RadialGlow.tsx`

**Approach:**
- `WindowChrome`: a `div` with `bg-surface`, rounded top, 1px `border-default`, a ~36px
  title bar containing three traffic-light dots (left-aligned, matching desktop's
  `titleBarStyle: 'hiddenInset'` feel) and an optional centered title string. Children render
  below the title bar with no additional padding so a screenshot fills edge-to-edge.
  `box-shadow` uses the desktop's `--shadow-dialog` recipe.
- `GridBackground`: absolutely positioned full-bleed `<div>` that paints a subtle grid via
  CSS `background-image: linear-gradient()` using `border-subtle` color, ~64px cell size,
  masked with a radial gradient so the grid fades to transparent at the edges
  (`mask-image: radial-gradient(ellipse at center, black 40%, transparent 75%)`). No JS,
  purely CSS.
- `RadialGlow`: absolutely positioned blurred disc of `accent` at low alpha (~12%),
  `filter: blur(120px)`, positioned via props (x/y offset, size). Purely decorative,
  `pointer-events-none`.
- All three are server components (no `"use client"`) — no JS cost.

**Patterns to follow:**
- macOS window chrome vocabulary from the desktop app (traffic lights, title bar height,
  radius `var(--radius-lg)`).

**Test scenarios:**
- **Happy path (WindowChrome):** renders three traffic-light dots and a children slot; when
  passed a `title` prop, the title string appears centered in the title bar.
- **Happy path (WindowChrome):** children render below the title bar and are not clipped
  when they exceed the chrome's height.
- **Edge case (GridBackground, RadialGlow):** both components accept `className` for
  positioning overrides and do not intercept pointer events (assert `pointer-events: none`
  in computed style or via rendered inline style).

**Verification:**
- Render each component in isolation in `page.tsx` (temporarily) and confirm visually: grid
  fades to transparent at edges, glow is soft and not banded, window chrome looks like a
  real macOS window.

---

- [ ] **Unit 3: Header + Footer**

**Goal:** Build the sticky header (logo, nav, Download CTA) and the footer (author, source,
license, issues). These frame every other section and should land early so subsequent units
see final page chrome.

**Requirements:** R2, R3.

**Dependencies:** Unit 1.

**Files:**
- Create: `apps/web/src/components/Header.tsx`
- Create: `apps/web/src/components/Footer.tsx`

**Approach:**
- `Header`: sticky top, `backdrop-blur`, `bg-void/70`, 1px bottom `border-subtle`, 56px tall.
  Left: wordmark "nodl" in `font-mono` + a small violet square logomark (12×12 rounded-sm).
  Center-right: nav links to `#features`, `#download`, and external GitHub. Right: primary
  download button linking to `DOWNLOAD_URL`. Anchor links use smooth scroll via CSS
  `scroll-behavior: smooth` on `html`.
- Use `lucide-react` `Download` icon in the CTA, `Github` icon for the GitHub link.
- `Footer`: muted, three columns on desktop / stacked on mobile. Left: logomark + "nodl
  v{APP_VERSION}" + "Made by Hung Doan" with link to GitHub profile. Middle: product links
  (Features, Download, Changelog → links to GitHub releases). Right: resource links (Source,
  Issues, License). Bottom divider with "© 2026" and "MIT License".

**Patterns to follow:**
- Desktop app toolbar visual language from `.toolbar` and `.toolbar-btn` in
  `apps/desktop/src/index.css` (height, border, transition timing).

**Test scenarios:**
- **Happy path:** Header renders wordmark, nav links, and download CTA; CTA `href` equals
  `DOWNLOAD_URL`; GitHub nav link has `target="_blank"` and `rel="noopener noreferrer"`.
- **Happy path:** Footer renders app version from `APP_VERSION` constant (string match).
- **Integration:** clicking an in-page anchor nav link scrolls (at minimum, the anchor
  href resolves to a section ID that will exist after Unit 4+; this is checkable via the
  `<a href="#features">` attribute rather than scroll behavior).

**Verification:**
- Header stays visible while scrolling, backdrop blur activates over content, download
  button is reachable from any scroll position.
- Footer spans full width and the version string matches `apps/desktop/package.json`.

---

- [ ] **Unit 4: Hero section**

**Goal:** The above-the-fold hero — headline, subhead, dual CTAs, and the grid + glow
background. This is the page's single most important visual moment; it should feel confident
and sparse, not busy.

**Requirements:** R1, R2, R3.

**Dependencies:** Unit 2, Unit 3.

**Files:**
- Create: `apps/web/src/components/Hero.tsx`

**Approach:**
- Outer `<section>` with `relative` positioning and `min-h-[85vh]`. Inside, layer order is:
  `<GridBackground>` (z-0) → `<RadialGlow>` behind headline (z-0, positioned mid-top) →
  content container (z-10).
- Content: centered, max-width ~720px. Small pill above headline: "v{APP_VERSION} — Now
  available for macOS", styled as a subtle `bg-surface`/`border-subtle` rounded-full badge,
  clickable → `DOWNLOAD_URL` (this is the "release announcement" pattern from Linear/Vercel
  sites).
- Headline: ~64px desktop / ~40px mobile, `font-weight 600`, `tracking-tight`, `text-bright`.
  Draft copy: *"A scratchpad for JavaScript. Write. Run. See."* Final copy is a taste call
  during build.
- Subhead: `text-secondary`, ~20px, max-width ~560px. Draft copy: *"Instant inline output.
  Full TypeScript. Real npm packages. Native desktop speed."*
- CTA row: primary Download button (lucide `Download` icon + "Download for macOS", accent
  styling per desktop's `.btn-primary`) and secondary GitHub button (ghost styling, lucide
  `Github` icon + "View on GitHub"). Below the CTA row, a tiny monospace keyboard hint:
  `⌘⏎ to run` in `text-tertiary`.
- No motion in the hero content itself — it should feel solid on load. Only the glow has a
  very slow ambient pulse (optional, can ship without).

**Patterns to follow:**
- `.btn-primary` styling from `apps/desktop/src/index.css` for the Download button
  (accent background with alpha, accent-bright text).

**Test scenarios:**
- **Happy path:** both CTA links render with correct hrefs (`DOWNLOAD_URL`, `GITHUB_URL`).
- **Happy path:** version pill renders the version from `APP_VERSION`.
- **Edge case:** hero renders without motion JS — assert the section is a server component
  (no `"use client"` directive) or, if the glow pulse uses client JS, the static fallback
  is legible without it (test by rendering without the motion wrapper).

**Verification:**
- Visually: grid fades to transparent at edges, glow sits behind headline without banding,
  CTAs are unmissable, the keyboard hint is a nice touch but not load-bearing.
- Lighthouse LCP element is the headline text (not an image).

---

- [ ] **Unit 5: Product preview + Features + How it works**

**Goal:** The three mid-page sections that convey what the app is, does, and feels like.
Bundling these because they share the same layout container width, the same scroll-reveal
motion pattern, and the same visual cadence — building them together avoids drift.

**Requirements:** R1, R4, R5.

**Dependencies:** Unit 2 (for `WindowChrome`), Unit 4 (for section width conventions).

**Files:**
- Create: `apps/web/src/components/ProductPreview.tsx`
- Create: `apps/web/src/components/Features.tsx`
- Create: `apps/web/src/components/HowItWorks.tsx`

**Approach:**
- `ProductPreview`: pulls up into the hero via negative top-margin (`-mt-24` ish). Centered
  `<WindowChrome>` at max-width ~1100px wrapping an `<img src="/screenshots/hero-product.png">`.
  Image has explicit `width`/`height` attrs to prevent CLS. Below the image, a soft
  bottom-fade gradient (`bg-gradient-to-b from-transparent to-bg-void`) over the chrome's
  lower ~20% so the screenshot blends into the next section — this is the
  Linear/Vercel "screenshot melts into page" trick. **Author supplies the screenshot
  post-merge**; ship a 1600×1000 dark placeholder PNG in the unit.
- `Features`: `<section id="features">`, 3×2 grid of feature cards on desktop, 1-col on
  mobile. Each card: lucide icon in accent color (size 18), title, one-line blurb. Copy
  sourced from `lib/constants.ts` so it can be edited without touching the component.
  Features to include (final list — update `constants.ts` accordingly):
  1. *Instant inline output* — `Zap` — "See results next to the line that produced them."
  2. *TypeScript, zero config* — `FileCode2` — "Strip types, run code. No setup."
  3. *Real npm packages* — `Package` — "Install from the sidebar, import like any project."
  4. *Multi-tab scratchpads* — `Files` — "Keep experiments separate. Switch with ⌘P."
  5. *Keyboard-first* — `Command` — "⌘⏎ to run. ⌘S to save. ⌘L to clear output."
  6. *Native desktop speed* — `Cpu` — "No browser tab. No sandbox tax. Electron + Node."
- Card styling: `bg-surface`, `border-subtle`, rounded-lg, padding ~24px, hover → `bg-elevated`
  + `border-default` + subtle accent tint on the icon.
- `HowItWorks`: three horizontal steps on desktop (Write → Run → See), stacked on mobile.
  Each step: big ordinal ("01", "02", "03") in monospace `text-tertiary`, title, short
  description, and a small code fragment in a faux-inline `bg-elevated` pill. Optional:
  arrow/dots between steps using lucide `ArrowRight` in `text-tertiary`.
- Motion: each section root uses Framer Motion's `whileInView` with `initial={{opacity:0, y:12}}`,
  `whileInView={{opacity:1, y:0}}`, `viewport={{once: true, margin: '-80px'}}`, duration 500ms,
  no bounce. Mark the motion wrappers `"use client"`; the card content stays server-rendered.

**Patterns to follow:**
- Desktop app's `.btn` / card hover transitions from `apps/desktop/src/index.css`
  (120–150ms, `var(--ease)`).
- Icon usage from `lucide-react` matching what the desktop uses (14–18px, `currentColor`).

**Test scenarios:**
- **Happy path (ProductPreview):** renders `<WindowChrome>` wrapping an image with explicit
  `width`/`height`; fallback/placeholder image exists at `/screenshots/hero-product.png` in
  `public/`.
- **Happy path (Features):** renders six cards sourced from `lib/constants.ts`; each card
  has an icon, title, and blurb; the section has `id="features"` for anchor links from header.
- **Happy path (HowItWorks):** renders three steps in correct order (01, 02, 03) with the
  expected titles.
- **Edge case (Features):** adding a seventh feature to `constants.ts` does not require
  touching the component (data-driven rendering assertion).
- **Integration:** `#features` anchor link from Header scrolls to the Features section
  (verifiable via DOM id presence + header href match).

**Verification:**
- Visually: sections breathe (generous vertical spacing), cards feel grouped not scattered,
  product preview frame looks like the real app, placeholder renders without layout shift.
- No motion JS is shipped for the cards themselves — only the section reveal wrapper is
  client-side.

---

- [ ] **Unit 6: Code showcase + Download section**

**Goal:** The final narrative beats before conversion: (a) show a real code snippet rendered
in app-faithful styling so visitors see exactly what the editor looks like, (b) close with a
focused download block that's the page's final conversion moment.

**Requirements:** R1, R2, R3, R5.

**Dependencies:** Unit 2 (WindowChrome), Unit 4 (section conventions), Unit 5 (motion wrapper).

**Files:**
- Create: `apps/web/src/components/CodeShowcase.tsx`
- Create: `apps/web/src/components/DownloadSection.tsx`

**Approach:**
- `CodeShowcase`: two-column on desktop (code left, output right), stacked on mobile. Both
  panels inside one `<WindowChrome>` so it reads as a single app window. Left panel:
  monospace code block, syntax-colored statically (use Monaco's `vs-dark` token colors from
  the desktop app's `:root` vars: `--type-string`, `--type-number`, `--type-boolean`, etc.
  Do NOT pull in Monaco itself or a full syntax-highlighter dependency — render a curated
  snippet with pre-coded `<span>` tokens. This is static content, so manual coloring is
  cheaper than importing Shiki/Prism). Right panel: simulated console output aligned per-line
  to the code, using `text-secondary` for values and `text-tertiary` for line-number
  gutters, exactly like the desktop app's `OutputPane`.
- Example snippet (draft — refine to taste):
  ```
  const users = [1, 2, 3].map(n => ({ id: n, name: `user-${n}` }))
  users.length                   // → 3
  users[0]                       // → { id: 1, name: "user-1" }
  await fetch('/api/health')     // → Response { ok: true }
  ```
- `DownloadSection`: `<section id="download">`, centered, max-width ~640px. Large headline
  ("Start scratching."), subhead, huge Download button (~56px tall, full-width on mobile)
  with lucide `Download` icon. Below: small text "macOS 12+ · Apple Silicon & Intel ·
  v{APP_VERSION} · {DMG_SIZE_APPROX}" (DMG size is a static string like "~90 MB"; the
  author can tune it — note in a comment). Below that: a quiet text link "Or view on
  GitHub" pointing to releases.
- Motion: same `whileInView` wrapper pattern from Unit 5.

**Patterns to follow:**
- Output formatting conventions from `apps/desktop/src/components/Output/OutputPane.tsx` and
  `ConsoleEntry.tsx` — monospace, line-aligned, subtle arrow (`//→` style) between code and
  result. Keep it faithful.
- Monaco `vs-dark` token colors from `apps/desktop/src/index.css` lines 50–54.

**Test scenarios:**
- **Happy path (CodeShowcase):** renders code lines and output lines in the same number of
  rows (one output per code line).
- **Happy path (DownloadSection):** download button `href` equals `DOWNLOAD_URL`; section
  has `id="download"` for anchor links from Header; version string in the fine print matches
  `APP_VERSION`.
- **Edge case (CodeShowcase):** the showcase renders without any syntax-highlighter library
  in the bundle (verify no Shiki/Prism/Monaco import in this file — grep-level check).

**Verification:**
- Visually: code showcase feels identical to the real app, download section is quiet but
  high-contrast enough to convert.
- Bundle analysis: no unexpected syntax-highlighter dependency pulled in.

---

- [ ] **Unit 7: Compose page.tsx, metadata polish, placeholder assets, final pass**

**Goal:** Wire all sections into `page.tsx` in the final order; finalize OG metadata;
commit placeholder assets for the author to overwrite; run the full build and eyeball the
static export; add a short README note explaining placeholder locations.

**Requirements:** R1, R2, R6, R7, R8.

**Dependencies:** Units 1–6.

**Files:**
- Modify: `apps/web/src/app/page.tsx`
- Modify: `apps/web/src/app/layout.tsx`
- Create: `apps/web/public/favicon.svg` (placeholder — a violet rounded square)
- Create: `apps/web/public/og-image.png` (placeholder — 1200×630 dark with "nodl")
- Create: `apps/web/public/screenshots/hero-product.png` (placeholder — 1600×1000 dark)
- Create: `apps/web/public/screenshots/feature-inline-output.png` (placeholder)
- Create: `apps/web/public/screenshots/feature-packages.png` (placeholder)
- Create: `apps/web/public/screenshots/README.md` (one paragraph: what each asset is, target
  dimensions, and where it appears on the page, so the author can swap them cleanly)

**Approach:**
- `page.tsx`: compose sections in order Header → Hero → ProductPreview → Features →
  HowItWorks → CodeShowcase → DownloadSection → Footer. Wrap the `<main>` with
  `scroll-smooth` on `<html>` (set in `globals.css`) so anchor links glide. Wrap sections
  below Hero in a consistent container (`mx-auto max-w-6xl px-6`) so vertical rhythm is
  uniform.
- `layout.tsx`: set rich metadata — title `"nodl — A scratchpad for JavaScript"`,
  description, `openGraph` block (type: website, url, siteName, images pointing to
  `/og-image.png`), `twitter` block (card: summary_large_image), `metadataBase`,
  `themeColor: '#171717'`, favicon link.
- Placeholder assets: generate dark-colored solid-fill PNGs of correct dimensions so the
  page renders without broken images or CLS. The `screenshots/README.md` tells the author
  what to replace.
- Responsive audit: check at 375px (iPhone SE), 768px (tablet), 1280px, 1920px. Fix any
  overflow, text-wrap, or spacing issues discovered.

**Patterns to follow:**
- Metadata pattern already present in `apps/web/src/app/layout.tsx`, extended to full OG
  tags per Next 15 conventions.

**Test scenarios:**
- **Happy path:** `pnpm --filter @nodl/web run build` produces a static export in
  `apps/web/out/` with `index.html`, `_next/static/...`, and all placeholder assets.
- **Happy path:** `<title>` of the built `index.html` contains "nodl" and the description.
- **Happy path:** OG image meta tag points to `/og-image.png` and the file exists in
  `public/`.
- **Happy path:** every anchor target referenced in Header (`#features`, `#download`)
  exists as a section `id` in the composed page.
- **Edge case:** all `<img>` tags on the page have explicit `width` and `height` (CLS guard).
- **Integration:** running the desktop monorepo's turbo build (`pnpm run build` at repo
  root) succeeds with the web app's new dependencies.

**Verification:**
- `pnpm --filter @nodl/web run build` exits 0.
- Serve `apps/web/out/` locally (`npx serve apps/web/out`) and click through every section
  + CTA.
- Open devtools on `/` at the four breakpoints above; no horizontal scroll, no clipped
  text, CTAs reachable.
- Lighthouse on the built static export: Performance ≥ 95, Accessibility ≥ 95, SEO ≥ 95.

---

## System-Wide Impact

- **Interaction graph:** The landing page is a self-contained static export and touches no
  other surface. The only cross-module coupling is reading `APP_VERSION` from
  `apps/desktop/package.json` at build time — make sure this import resolves under Next's
  static export pipeline.
- **Error propagation:** No runtime errors to propagate (static page, no APIs). Placeholder
  images must exist at build time or Next's static export fails.
- **State lifecycle risks:** None — no state, no user data, no persistence.
- **API surface parity:** Not applicable.
- **Integration coverage:** Covered by Unit 7's full-build verification.
- **Unchanged invariants:** The desktop app, the monorepo's turbo config, the release
  script, and the worker build pipeline are **not** modified. The web app continues to
  static-export to `apps/web/out/`.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| Cross-package JSON import (`apps/desktop/package.json`) fails under Next static export | If it fails, fall back to a constant in `lib/constants.ts` and note in the file that it must be bumped alongside desktop releases. |
| Placeholder images too heavy, inflating the static export | Ship minimal solid-fill PNGs (< 20 KB each); author replaces with optimized real assets. |
| Framer Motion adds bundle weight | Mark motion wrappers as `"use client"` only, leave section bodies server-rendered; Framer Motion tree-shakes per-component. Expect added JS < 40 KB gzipped. |
| Design drifts into generic "AI slop" landing-page aesthetic (huge gradient, glass cards, emoji features) | Explicit reference points in plan (Linear, Raycast, Zed), explicit palette lock from desktop app, one (not multiple) hero effect rule. Optional: run `compound-engineering:document-review:design-lens-reviewer` on this plan before execution. |
| Asset placeholders get forgotten and ship to prod | Unit 7 ships a `screenshots/README.md` the author reads before deploy; add it to a pre-release checklist in memory if needed. |
| Tailwind v3 vs v4 mismatch if someone upgrades later | Pin exact major in `package.json`; note in plan that desktop is on v3 and web should match until desktop migrates. |

## Documentation / Operational Notes

- The `apps/web/public/screenshots/README.md` documents what each placeholder is and what
  the author should supply.
- No changes to the release script (`apps/desktop/scripts/release.sh`) — the web app
  deploys separately.
- Hosting target is out of scope for this plan but a reasonable default is GitHub Pages or
  Vercel. The static export already supports either.

## Sources & References

- Desktop app design system: `apps/desktop/src/index.css`
- Project conventions: `.claude/CLAUDE.md` (UI/UX Conventions, Design System sections)
- Inspiration: Aceternity UI (`aceternity.com`), 21st.dev background collection, Linear, Raycast, Zed, Codex
- Next.js 15 static export: `apps/web/next.config.ts` (already configured)
- Existing placeholder page being replaced: `apps/web/src/app/page.tsx`
