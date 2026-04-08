# nodl — Space Terminal Design System

> **Aesthetic: sci-fi command console.** Squared edges, bracket decorations, monospaced everything, scanline overlay, wireframe borders, terminal green accent. Think Alien (1979) ship computer meets Cyberpunk data terminal.

## Core Principles

- **Zero border-radius.** Every element is squared. No rounded corners anywhere.
- **Brackets as decoration.** `[ ]` wraps interactive labels. `├──` prefixes section headers. `<-` replaces `←` for return values.
- **Monospace everything.** JetBrains Mono for all text — code, UI, labels, buttons.
- **Uppercase labels.** All button text, section headers, and status indicators are uppercase with wide letter-spacing.
- **Scanline overlay.** Subtle repeating gradient over the entire app creating CRT-like scan lines.
- **Terminal cyan-green accent.** `#00ffc8` — one color to rule them all.

## Color Palette

| Token | Value | Usage |
|-------|-------|-------|
| `--bg-void` | `#05080a` | Deepest black, app root |
| `--bg-primary` | `#0a0e12` | Main panels |
| `--bg-surface` | `#0e1317` | Sidebar, toolbars |
| `--bg-elevated` | `#131920` | Dialogs, header |
| `--accent` | `#00ffc8` | THE color — buttons, indicators, results |
| `--accent-dim` | `rgba(0,255,200,0.12)` | Accent backgrounds |
| `--border-default` | `rgba(0,255,200,0.12)` | Wireframe borders (tinted) |
| `--border-strong` | `rgba(0,255,200,0.22)` | Emphasis borders |
| `--text-primary` | `#c8d6df` | Body text |
| `--text-secondary` | `#6b8294` | Labels |
| `--text-muted` | `#3a4f5e` | Dimmed/disabled |
| `--danger` | `#ff3b5c` | Errors, stop/halt |
| `--warn` | `#ffb627` | Warnings |
| `--info` | `#4da6ff` | Info logs |

## Typography

**One font family everywhere:** `'JetBrains Mono', 'SF Mono', Menlo, Monaco, monospace`

| Element | Size | Style |
|---------|------|-------|
| App title (header) | 12px | uppercase, tracking 0.08em, accent color |
| Section labels | 10px | uppercase, tracking 0.1em, with `├──` prefix |
| Buttons | 11px | uppercase, tracking 0.04em |
| Tab names | 11px | normal case |
| Editor + Output | User setting | normal |
| Status text | 10px | with `[OK]` / `[ERR]` prefix |

## Button Pattern

All buttons use the `.btn` base class: squared, bordered, uppercase, monospace.

| Variant | Style |
|---------|-------|
| `.btn` (default) | transparent bg, `--border-default` border, secondary text |
| `.btn-primary` | accent-tinted bg, accent border, accent text, glow on hover |
| `.btn-danger` | red-tinted bg, red border |
| `.btn-ghost` | no border, no bg, muted text → secondary on hover |

Active indicator: blinking dot `●` with `animate-blink` (1.2s step-end).

## Bracket Conventions

| Context | Pattern | Example |
|---------|---------|---------|
| Header controls | `[LABEL]` | `[DRK]` `[CFG]` |
| Toggles | `[ON]` / `[OFF]` | settings toggles |
| Status | `[OK]` / `[ERR]` | execution result |
| New tab button | `[+]` | sidebar bottom |
| Section prefix | `├──` | `├── files`, `├── editor` |
| Return values | `<-` | expression results |
| Language indicator | `─── TS ───` | editor toolbar center |
| Keyboard hints | `[ cmd+enter ]` | output empty state |

## Layout

| Element | Value |
|---------|-------|
| Header | 36px, `--bg-surface` |
| Sidebar expanded | 192px |
| Sidebar collapsed | 42px |
| Active tab indicator | 2px left border in accent |
| Resizer | 1px, accent glow on hover/drag |
| Empty state | `{ }` in 32px, "awaiting input..." |

## Scanline Effect

Applied via `#root::after` pseudo-element:
```css
background: repeating-linear-gradient(
  0deg, transparent, transparent 2px,
  rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px
);
```
Pointer-events: none. z-index: 9999.

## Logo

Squared frame with corner tick marks (crosshair-style). Accent letter "n" centered. No rounded corners.

## File Reference

- Design tokens & CSS classes: `src/index.css`
- This document: `STYLE.md`
