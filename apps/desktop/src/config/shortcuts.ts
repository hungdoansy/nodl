/**
 * Single source of truth for user-visible keyboard shortcuts.
 *
 * The hint overlay renders from this list when the user holds the modifier
 * key for a moment. `useKeyboardShortcuts` dispatches actions by matching
 * `KeyboardEvent.key` against `matchKey` — kept separate from `display`
 * because display text (`1–9`, `Enter`) isn't what `e.key` gives us.
 */

export interface ShortcutDef {
  /** Human-readable key(s), shown in the overlay after the modifier glyph */
  display: string
  /** Short description of what the shortcut does */
  label: string
  /** Requires Shift in addition to the modifier */
  shift?: boolean
}

export const SHORTCUTS: ShortcutDef[] = [
  { display: 'Enter', label: 'Run code' },
  { display: 'S', label: 'Save' },
  { display: 'N', label: 'New file' },
  { display: 'W', label: 'Close tab' },
  { display: ',', label: 'Settings' },
  { display: '1–9', label: 'Switch to tab' },
]

/** Delay before the hint overlay appears. Gives experienced users time to
 * press their shortcut without seeing the hint flash. */
export const HINT_DELAY_MS = 1000
