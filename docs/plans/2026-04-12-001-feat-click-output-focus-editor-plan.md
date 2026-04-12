---
title: "feat: Click output entry to focus editor on source line"
type: feat
status: active
date: 2026-04-12
---

# feat: Click output entry to focus editor on source line

## Overview

Clicking an output entry in OutputPane focuses the Monaco editor on the corresponding source line — reveals the line, moves the cursor there, and focuses the editor. This connects output back to input, letting users quickly navigate from a result to the code that produced it.

## Problem Frame

When users see an output entry (console.log, expression result, error), there's no way to jump to the source line that produced it. For long files, this means manually scrolling or counting lines. The `line` property already exists on every `OutputEntry` — this feature just needs to wire a click handler through to the editor.

## Requirements Trace

- R1. Clicking an output entry with a known `line` focuses the editor on that line
- R2. Editor cursor moves to the line and the editor receives focus
- R3. Works in both aligned and console output modes
- R4. Entries without a `line` (unlined errors, etc.) are not clickable
- R5. Visual cursor feedback on hoverable entries so users know they can click

## Scope Boundaries

- No keyboard navigation (e.g., arrow keys in output to move editor cursor)
- No highlight/flash animation on the editor line after focus (can be added later)
- No reverse direction (clicking editor line to scroll output)

## Context & Research

### Relevant Code and Patterns

- **`useErrorHighlighting` hook** (`src/hooks/useErrorHighlighting.ts`) — the established pattern for EditorPane←→output coordination. Takes `editorRef`, subscribes to output store, calls Monaco API. This feature follows the same shape.
- **`scroll-sync` store** (`src/store/scroll-sync.ts`) — Zustand store for cross-component editor/output state. Uses the pattern of storing state + a setter, consumed by both EditorPane and OutputPane.
- **`ui` store** (`src/store/ui.ts`) — simple Zustand store for UI state. Good home for the focus-line action.
- **`EditorPane`** (`src/components/Editor/EditorPane.tsx:34`) — `editorRef` holds the Monaco editor instance. Already passed to `useErrorHighlighting`. Monaco API: `editor.revealLineInCenter()`, `editor.setPosition()`, `editor.focus()`.
- **`ConsoleEntryComponent`** (`src/components/Output/ConsoleEntry.tsx`) — pure presentational, receives `entry` prop with `line` field. Currently has no click handler or callback props.
- **`OutputPane`** (`src/components/Output/OutputPane.tsx`) — renders entries via `ConsoleEntryComponent`. Groups entries by line in aligned mode. No click handlers currently.
- **`App.tsx`** — EditorPane and OutputPane are sibling panels under `react-resizable-panels`. No props passed between them — all communication via Zustand stores and hooks.

## Key Technical Decisions

- **Zustand store for focus request (not callback props):** EditorPane and OutputPane are siblings with no shared parent passing props. The existing cross-component pattern (scroll-sync, error highlighting) uses stores + hooks. Adding `focusLine` to `ui.ts` follows this convention.
- **Single hook in EditorPane (not App.tsx):** `useEditorFocus` needs `editorRef` which lives in EditorPane. Same pattern as `useErrorHighlighting(editorRef)` on EditorPane line 42.
- **Click on the ConsoleEntry wrapper div:** The entire entry row is the click target, not a separate button. This keeps the UI clean and the interaction obvious. `cursor: pointer` only when `entry.line` exists.

## Open Questions

### Resolved During Planning

- **Where to store focus state?** → `ui.ts` — it's UI state, and the store is already used by both components.
- **How to communicate to editor?** → Same pattern as error highlighting: store holds the target line, hook in EditorPane subscribes and calls Monaco API.

### Deferred to Implementation

- **Should `revealLineInCenter` or `revealLine` be used?** → Try `revealLineInCenter` first, adjust if it feels wrong for lines near the top/bottom of the file.

## Implementation Units

- [ ] **Unit 1: Add focus-line state to ui store**

  **Goal:** Add `focusLine` state and `requestEditorFocus` action to the UI store.

  **Requirements:** R1

  **Dependencies:** None

  **Files:**
  - Modify: `apps/desktop/src/store/ui.ts`

  **Approach:**
  - Add `focusLine: number | null` to `UIState`
  - Add `requestEditorFocus: (line: number | null) => void` action that sets `focusLine`
  - Initialize `focusLine` to `null`

  **Patterns to follow:**
  - Existing actions in `ui.ts` (e.g., `setOutputMode`)

  **Test scenarios:**
  - Happy path: `requestEditorFocus(5)` sets `focusLine` to 5
  - Happy path: `requestEditorFocus(null)` clears `focusLine`

  **Verification:**
  - Store action works in existing test infrastructure

- [ ] **Unit 2: Add useEditorFocus hook**

  **Goal:** Subscribe to `focusLine` changes and drive Monaco editor to that line.

  **Requirements:** R1, R2

  **Dependencies:** Unit 1

  **Files:**
  - Create: `apps/desktop/src/hooks/useEditorFocus.ts`

  **Approach:**
  - Hook takes `editorRef` (same signature as `useErrorHighlighting`)
  - `useEffect` subscribes to `useUIStore` `focusLine`
  - When `focusLine` is non-null: call `editor.revealLineInCenter(focusLine)`, `editor.setPosition({ lineNumber: focusLine, column: 1 })`, `editor.focus()`
  - After applying, clear `focusLine` back to `null` so re-clicking the same line works

  **Patterns to follow:**
  - `useErrorHighlighting` (`src/hooks/useErrorHighlighting.ts`) — same `editorRef` parameter, same store subscription pattern

  **Test scenarios:**
  - Happy path: setting `focusLine` to 5 calls `revealLineInCenter(5)`, `setPosition({lineNumber: 5, column: 1})`, and `focus()`
  - Edge case: `focusLine` null → no editor API calls
  - Edge case: `editorRef.current` is null → no crash

  **Verification:**
  - Hook is called in EditorPane and responds to store changes

- [ ] **Unit 3: Wire useEditorFocus into EditorPane**

  **Goal:** Activate the hook so the editor responds to focus requests.

  **Requirements:** R1, R2

  **Dependencies:** Unit 2

  **Files:**
  - Modify: `apps/desktop/src/components/Editor/EditorPane.tsx`

  **Approach:**
  - Import and call `useEditorFocus(editorRef)` alongside the existing `useErrorHighlighting(editorRef)` call (line 42)

  **Patterns to follow:**
  - `useErrorHighlighting(editorRef)` on EditorPane line 42

  **Test expectation:** none — pure wiring, behavior tested via Unit 2

  **Verification:**
  - Editor responds when `requestEditorFocus` is called from console

- [ ] **Unit 4: Add click handler to ConsoleEntry and OutputPane**

  **Goal:** Clicking an output entry dispatches `requestEditorFocus(entry.line)`.

  **Requirements:** R1, R3, R4, R5

  **Dependencies:** Unit 1

  **Files:**
  - Modify: `apps/desktop/src/components/Output/ConsoleEntry.tsx`
  - Modify: `apps/desktop/src/components/Output/OutputPane.tsx`

  **Approach:**
  - Add optional `onLineClick?: (line: number) => void` prop to `ConsoleEntryComponent`
  - In the outermost div of ConsoleEntry, add `onClick` that calls `onLineClick(entry.line)` when `entry.line` exists and `onLineClick` is provided
  - Add `cursor: 'pointer'` to the entry div style when clickable (has `line` and `onLineClick`)
  - In OutputPane, define a callback: `const handleLineClick = useCallback((line: number) => useUIStore.getState().requestEditorFocus(line), [])`
  - Pass `onLineClick={handleLineClick}` to `ConsoleEntryComponent` in both aligned and console rendering modes
  - Only pass it for entries that have a `line` (entries without `line` stay non-clickable)

  **Patterns to follow:**
  - Callback prop pattern used elsewhere in the component tree
  - `useUIStore.getState()` direct access pattern (used in `useOutputListener`)

  **Test scenarios:**
  - Happy path: clicking entry with `line: 5` calls `requestEditorFocus(5)`
  - Happy path: works in aligned mode
  - Happy path: works in console mode
  - Edge case: entry without `line` — no cursor pointer, click does nothing
  - Edge case: entry in error banner (unlined) — not clickable

  **Verification:**
  - Click any output entry → editor scrolls to and focuses the source line
  - Entries without line numbers show default cursor and don't trigger focus

## System-Wide Impact

- **Interaction graph:** OutputPane click → ui store `focusLine` → useEditorFocus hook → Monaco API. No other subscribers affected.
- **Scroll sync:** `revealLineInCenter` changes editor scroll position, which will trigger the existing scroll-sync mechanism to sync the output panel. This is correct behavior — both panels stay aligned.
- **Error highlighting:** Unaffected — separate decoration system, no interaction.

## Risks & Dependencies

| Risk | Mitigation |
|------|------------|
| `revealLineInCenter` triggers scroll-sync feedback loop | Scroll sync already handles source tracking (`source: 'editor'` vs `'output'`), so editor-initiated scrolls won't bounce back |
| Clicking expanded ObjectTree nodes accidentally triggers line focus | Click handler is on the ConsoleEntry wrapper div; ObjectTree click handlers for expand/collapse use `stopPropagation` or are on inner elements — verify during implementation |
