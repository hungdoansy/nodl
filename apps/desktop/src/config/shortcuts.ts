/**
 * Single source of truth for user-visible keyboard shortcuts.
 *
 * The hint overlay renders from this list when the user holds the modifier
 * key for HINT_DELAY_MS. When adding a new shortcut to useKeyboardShortcuts,
 * add it here too so the overlay stays in sync.
 */

import type { ShortcutOptions } from '../utils/shortcut'

export interface ShortcutDef {
  /** Human-readable key(s), shown in the overlay after the modifier glyph */
  display: string
  /** Short description of what the shortcut does */
  label: string
  /** Modifier options (shift, alt, etc.). Platform mod is always on. */
  opts?: ShortcutOptions
}

export const SHORTCUTS: ShortcutDef[] = [
  { display: 'Enter', label: 'Run code' },
  { display: 'S',     label: 'Save' },
  { display: 'N',     label: 'New file' },
  { display: 'W',     label: 'Close tab' },
  { display: ',',     label: 'Settings' },
  { display: '1–9',   label: 'Switch to tab' },
  { display: 'K',     label: 'Clear output' },
  { display: 'C',     label: 'Copy output',         opts: { mod: true, shift: true } },
  { display: 'M',     label: 'Toggle output mode',  opts: { mod: true, shift: true } },
  { display: 'P',     label: 'Open packages',       opts: { mod: true, shift: true } },
  { display: 'A',     label: 'Toggle auto-run',     opts: { mod: true, shift: true } },
]

/** Delay before the hint overlay appears. Gives experienced users time to
 * press their shortcut without seeing the hint flash. */
export const HINT_DELAY_MS = 1000
