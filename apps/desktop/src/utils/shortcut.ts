/**
 * Platform-aware keyboard-shortcut display for native `title` tooltips.
 *
 * Conventions:
 *  - macOS uses the glyph form (⌘, ⇧, ⌥, ⌃) with no separator.
 *  - Other platforms use the word form (Ctrl+, Shift+, Alt+).
 *  - Display order is Cmd/Ctrl → Shift → Alt/Option → Ctrl-on-Mac → key.
 *    This matches what users write ("⌘⇧P", "Ctrl+Shift+P") and what most
 *    modern Mac apps render. Apple HIG prefers physical-keyboard order
 *    (⌃⌥⇧⌘) but it trips up users' muscle memory for spelling chords.
 *  - Trailing key is human-written (e.g. `'Enter'`, `'N'`, `','`).
 */

export const IS_MAC =
  typeof navigator !== 'undefined' && navigator.platform.includes('Mac')

export interface ShortcutOptions {
  mod?: boolean    // Cmd / Ctrl
  shift?: boolean
  alt?: boolean    // Option on Mac
  ctrl?: boolean   // Control on Mac (useful for Mac-specific Ctrl chords)
}

/** Format a shortcut like `⌘Enter` or `Ctrl+Enter` for use in title attrs. */
export function shortcut(key: string, opts: ShortcutOptions = { mod: true }): string {
  if (IS_MAC) {
    let out = ''
    if (opts.mod) out += '⌘'
    if (opts.shift) out += '⇧'
    if (opts.alt) out += '⌥'
    if (opts.ctrl) out += '⌃'
    return out + key
  }
  const parts: string[] = []
  if (opts.mod || opts.ctrl) parts.push('Ctrl')
  if (opts.shift) parts.push('Shift')
  if (opts.alt) parts.push('Alt')
  parts.push(key)
  return parts.join('+')
}

/** Join a description with its shortcut in parentheses, e.g. `Run (⌘Enter)`. */
export function withShortcut(label: string, key: string, opts?: ShortcutOptions): string {
  return `${label} (${shortcut(key, opts)})`
}
