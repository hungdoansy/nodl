# nodl — Design System & Styling Guide

This document defines the visual identity, color palette, component patterns, and styling conventions for the nodl app. It serves as the source of truth for AI-assisted development so design decisions remain consistent across sessions.

## Philosophy

- **Quiet and precise.** The UI stays out of the way. Code and output are the focus.
- **Monochrome + one accent.** The chrome is neutral zinc tones; emerald green is the single accent color used sparingly for primary actions and expression results.
- **Deterministic.** Every color, radius, and spacing value comes from the system below — no ad-hoc hex codes or magic numbers.
- **Dense but not cramped.** Small font sizes, tight spacing, but generous enough to be readable.

## Color Palette

All colors use Tailwind's zinc scale for neutrality.

| Token | Dark mode | Usage |
|-------|-----------|-------|
| `bg-primary` | `bg-zinc-900` (#18181b) | Main background, editor bg |
| `bg-surface` | `bg-zinc-850` (#1e1e22) | Sidebar, panels, toolbars — custom color via CSS var |
| `bg-elevated` | `bg-zinc-800` (#27272a) | Header, dialogs, dropdowns |
| `bg-hover` | `bg-zinc-700` (#3f3f46) | Hover states on interactive elements |
| `bg-active` | `bg-zinc-700/50` | Active/pressed states |
| `border-default` | `border-zinc-800` (#27272a) | Subtle borders between panels |
| `border-strong` | `border-zinc-700` (#3f3f46) | Visible borders (header bottom, dividers) |
| `text-primary` | `text-zinc-100` (#f4f4f5) | Headings, active tab text |
| `text-secondary` | `text-zinc-400` (#a1a1aa) | Labels, inactive text, secondary info |
| `text-muted` | `text-zinc-500` (#71717a) | Placeholders, disabled text |
| `accent` | `emerald-500` (#10b981) | Primary buttons, expression results, active indicators |
| `accent-hover` | `emerald-400` (#34d399) | Hover on accent elements |
| `danger` | `red-500` (#ef4444) | Errors, stop button, destructive actions |
| `warn` | `amber-500` (#f59e0b) | Warnings, auto-run active state |

## Typography

| Element | Font | Size | Weight |
|---------|------|------|--------|
| App title | System sans (Inter) | 13px (`text-[13px]`) | 600 (`font-semibold`) |
| Tab labels | Mono | 12px (`text-xs`) | 400 |
| Toolbar buttons | System sans | 11px (`text-[11px]`) | 500 (`font-medium`) |
| Editor | Mono (Menlo, Monaco, Consolas) | User setting (default 14px) | 400 |
| Output | Mono | Same as editor setting | 400 |
| Settings labels | System sans | 13px | 400 |

## Spacing & Layout

| Element | Value |
|---------|-------|
| Header height | 38px (py-1.5 + content) |
| Sidebar width (expanded) | 180px |
| Sidebar width (collapsed) | 40px |
| Toolbar height | 33px (py-1.5 + buttons) |
| Panel gap (resizer) | 1px visual, 8px hit area |
| Border radius (buttons) | `rounded` (4px) |
| Border radius (dialogs) | `rounded-lg` (8px) |
| Padding (toolbar items) | `px-2 py-1` |

## Button Styles

Three button variants:

### Primary (accent)
```
bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700
text-white text-[11px] font-medium rounded px-2.5 py-1
```

### Secondary (neutral)
```
bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-600
text-zinc-300 text-[11px] font-medium rounded px-2 py-1
border border-zinc-700
```

### Ghost (icon buttons)
```
text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800
active:bg-zinc-700 rounded p-1.5 transition-colors
```

## Resizer

The panel resizer should be nearly invisible at rest and subtly visible on hover:

```
width: 1px (visual), 8px (hit area via padding)
bg-zinc-800 (rest) → bg-zinc-600 (hover) → bg-emerald-500/50 (active/dragging)
No outline, no border. cursor-col-resize.
```

## Sidebar (Tab List)

- Vertical list on the left side
- Collapsed: 40px wide, shows only icons/first letter
- Expanded: 180px wide, shows full tab name
- Toggle via chevron button at the bottom
- Active tab: left emerald border accent (2px), slightly lighter bg
- Hover: bg-zinc-800

## Component Tokens (CSS Custom Properties)

Defined in `index.css` on `:root` / `.dark`:

```css
--bg-primary: #18181b;
--bg-surface: #1e1e22;
--bg-elevated: #27272a;
--border-default: #27272a;
--border-strong: #3f3f46;
--accent: #10b981;
```

These allow future light-theme support by overriding under `.light`.

## Logo

The nodl logo is a minimal geometric mark:
- A rounded square (the "node") with the letter "n" inside
- Emerald green on dark background
- Used at 20x20 in the header, larger in about/splash

## File Reference

- Colors & variables: `src/index.css`
- Tailwind config: `tailwind.config.js`
- Component patterns: follow existing code in `src/components/`
- This file: `STYLE.md` (source of truth for design decisions)
