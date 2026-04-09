# nodl — Design System

> **Aesthetic:** Warm neutral dark. Clean, professional IDE feel. Think VS Code meets Codex. No sci-fi, no terminal gimmicks.

## Principles

- **Warm grays, not cool blues.** Background palette is `#171717` → `#2d2d2d`, not blue-tinted.
- **System font for UI.** `-apple-system, BlinkMacSystemFont` — native feel, not a loaded web font.
- **Monospace only for code.** JetBrains Mono in editor and output. Everything else is system sans-serif.
- **Rounded corners.** `6px` / `8px` / `12px` — soft, modern.
- **Accent is violet `#a78bfa`.** Used sparingly: active states, expression results, toggle indicators.
- **Icon-only toolbar buttons.** 28x28px, tooltip on hover. No text labels in toolbars.
- **Metadata is unselectable.** Type tags (`Object {3}`), key labels, `<-` arrows, "Output" label — all `userSelect: none`.

## Color Tokens

### Dark (`:root, .dark`)

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#171717` | App root background |
| `--bg-primary` | `#1e1e1e` | Editor and output panels |
| `--bg-surface` | `#252525` | Sidebar, toolbars, header |
| `--bg-elevated` | `#2d2d2d` | Dialogs |
| `--bg-hover` | `rgba(255,255,255,0.04)` | Hover states |
| `--bg-active` | `rgba(255,255,255,0.07)` | Active/pressed states |
| `--bg-input` | `#333333` | Input fields, selects |
| `--border-subtle` | `rgba(255,255,255,0.06)` | Panel dividers |
| `--border-default` | `rgba(255,255,255,0.10)` | Button borders |
| `--border-strong` | `rgba(255,255,255,0.16)` | Hover borders |
| `--accent` | `#a78bfa` | Violet accent |
| `--accent-bright` | `#c4b5fd` | Accent text on dark bg |
| `--accent-dim` | `rgba(167,139,250,0.10)` | Accent backgrounds |
| `--text-primary` | `#e5e5e5` | Body text |
| `--text-secondary` | `#999999` | Labels, descriptions |
| `--text-tertiary` | `#666666` | Dimmed, metadata |
| `--text-bright` | `#f5f5f5` | Emphasis |

### Light (`.light`)

Inverted: light backgrounds, darker text. Accent shifts to `#7c3aed`.

## Typography

| Role | Font | Size |
|------|------|------|
| UI text | System sans-serif | 12-13px |
| Code / output | JetBrains Mono | User-configurable (default 14px) |
| Section headers | System sans-serif | 11px, `--text-tertiary` |
| Toolbar labels | System sans-serif | 12px, `--text-tertiary` |
| Monospace values | JetBrains Mono | 11-12px |

## Layout

| Element | Size |
|---------|------|
| Header | 38px fixed (`shrink-0`, `min-height: 38px`) |
| Toolbar (editor/output) | 36px fixed (`shrink-0`, `min-height: 36px`) |
| Sidebar expanded | 200px |
| Sidebar collapsed | 44px |
| Sidebar transition | 180ms `cubic-bezier(0.16, 1, 0.3, 1)` |

## Components

### Buttons

- `.btn` — bordered, 12px, rounded `6px`
- `.btn-primary` — accent tint + border
- `.btn-danger` — red tint
- `.btn-ghost` — borderless, transparent
- `.toolbar-btn` — icon-only 28x28px, no border, `6px` radius. States: default (tertiary), hover (primary + bg), `.active` (accent), `.primary` (accent tint), `.danger` (red tint)

### Dialogs

- Rounded `12px`, backdrop blur `4px`, `rgba(0,0,0,0.5)` overlay
- Enter: `translateY(-8px) scale(0.98)` → `translateY(0) scale(1)`, opacity 0→1, 150ms
- Exit: reverse, then unmount after 150ms
- Use `useDialogTransition(open)` hook — returns `{ mounted, visible, close }`

### Resizer

- Target via `[data-separator]` (react-resizable-panels v4.9)
- 1px `--border-subtle` line
- Hover: 3px accent stripe at 50% opacity via `::after`
- Dragging: accent stripe at 100% opacity

### Object Tree

- Expand/collapse: `ChevronRight` rotated 90° with `transition: transform 150ms ease`
- Type tags and key labels are `userSelect: none`
- Indent: 16px `margin-left` + 1px `--border-subtle` left border + 8px `padding-left`

### Scrollbars

- 6px wide, rounded thumb
- `rgba(255,255,255,0.08)` default, `0.15` on hover

## Sidebar Items

Files, Packages, and Settings buttons all share the same layout:
- Padding: `5px 8px` (expanded), `6px 0` centered (collapsed)
- Gap: `7px`
- Icon: 13px expanded, 14px collapsed
- Text: 12px
- Border radius: `var(--radius-sm)`
- Hover: `var(--bg-hover)` background

## Output Modes

- **Aligned:** Output entries positioned at matching editor line. Empty lines rendered as spacers with `height: lineHeight`. Scroll-synced with editor.
- **Console:** Sequential list, no alignment. Auto-scrolls to bottom.
- Errors pinned to top in aligned mode with red tint background.

## File Reference

- Design tokens & CSS classes: `src/index.css`
- This document: `STYLE.md`
