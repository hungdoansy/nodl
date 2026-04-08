# nodl — Design System

> **"Precision Terminal"** — Ultra-clean dark surfaces. Depth through shadow, not borders. One accent color. Every pixel intentional.

## Philosophy

- **Depth over borders.** Panels separate through background layers and shadows, not visible border lines. Borders are `rgba(255,255,255,0.06–0.12)` — structural, not decorative.
- **One accent.** Teal-emerald (`#34d399`) is the only color. Used for: primary buttons, active indicators, expression results, toggle states, resizer glow. Everything else is greyscale.
- **Dense precision.** Small type (11–13px UI), tight spacing, monospace code. Generous negative space in empty states.
- **Quiet motion.** 150–200ms transitions with `cubic-bezier(0.22, 1, 0.36, 1)`. No bouncing, no spring physics. Scale-in for dialogs, fade-in for content.

## Color System (CSS Custom Properties)

All colors defined in `src/index.css` on `:root`:

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#0c0c0e` | Deepest background, app root |
| `--bg-primary` | `#121214` | Main panels, editor/output bg |
| `--bg-surface` | `#18181b` | Sidebar, toolbars |
| `--bg-elevated` | `#1e1e22` | Header, dialogs, dropdowns |
| `--bg-hover` | `rgba(255,255,255,0.04)` | Hover states |
| `--bg-active` | `rgba(255,255,255,0.06)` | Pressed/active states |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Panel separators (barely visible) |
| `--border-default` | `rgba(255,255,255,0.08)` | Input borders, dividers |
| `--border-strong` | `rgba(255,255,255,0.12)` | Focus rings, emphasis |
| `--accent` | `#34d399` | Primary action color |
| `--accent-dim` | `rgba(52,211,153,0.15)` | Accent backgrounds, glow |
| `--accent-glow` | `rgba(52,211,153,0.08)` | Subtle accent wash |
| `--text-primary` | `#e4e4e7` | Headings, active text |
| `--text-secondary` | `#a1a1aa` | Body text, labels |
| `--text-muted` | `#63636e` | Placeholders, disabled |
| `--text-accent` | `#34d399` | Accent text |

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| App title | System sans | 13px | 600 (semibold) |
| Section labels | System sans | 10px uppercase tracking-widest | 600 |
| Toolbar buttons | System sans | 11px | 500 |
| Tab names | JetBrains Mono | 12px | 400 |
| Editor + Output | JetBrains Mono | User setting (default 14px) | 400 |
| Settings labels | System sans | 13px | 400 |

Font stack: `'JetBrains Mono', Menlo, Monaco, 'Courier New', monospace`
Loaded via Google Fonts in `index.html`.

## Shadows

Three levels of depth:

| Token | Value | Usage |
|-------|-------|-------|
| `--shadow-panel` | `0 1px 3px rgba(0,0,0,0.4), inset ring` | Panels, cards |
| `--shadow-elevated` | `0 4px 16px rgba(0,0,0,0.5), inset ring` | Popovers, menus |
| `--shadow-dialog` | `0 16px 48px rgba(0,0,0,0.6), inset ring` | Modal dialogs |

## Button Variants

Defined as CSS utility classes in `index.css`:

### `.btn-primary` — Primary actions (Run)
Accent background, dark text. Glow on hover. Scale down on active.

### `.btn-secondary` — Secondary actions (Auto, Language, Clear)
Transparent with subtle border. Lightens on hover.

### `.btn-ghost` — Icon buttons (Theme, Settings, Sidebar toggle)
No background. Color change on hover.

### `.btn-danger` — Destructive actions (Stop)
Red-tinted background and border.

All buttons: `transition: 150ms`, `transform: scale(0.97)` on active.

## Layout Constants

| Element | Value |
|---------|-------|
| Header height | 38px |
| Sidebar expanded | 184px |
| Sidebar collapsed | 44px |
| Toolbar height | ~33px (py-1.5 + buttons) |
| Resizer visual width | 1px |
| Resizer hit area | 8px (via ::before pseudo) |
| Border radius (buttons) | 4px (`--radius-sm`) |
| Border radius (dialogs) | 10px (`--radius-lg`) |

## Component Patterns

### Sidebar
- Active tab: left `--accent` bar (3px wide), `--bg-hover` background
- Collapsed: shows first letter, accent color when active
- Section label: "Files" in muted uppercase
- Green dot file indicator

### Resizer
- At rest: `--border-subtle` (nearly invisible)
- Hover: accent color at 40% opacity with soft glow
- Active: accent at 60% with stronger glow
- No outline, no border. Clean.

### Settings Dialog
- Backdrop blur (4px) over dark overlay
- Scale-in animation on open
- Sections separated by uppercase labels
- Custom toggle switches (accent green when on)

### Empty State (Output)
- Centered icon + text + keyboard hint
- Lightning bolt SVG at 30% opacity
- "Cmd+Enter" muted helper

## File Reference

- Design tokens: `src/index.css`
- This document: `STYLE.md`
