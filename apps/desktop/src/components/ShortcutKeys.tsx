import type { ReactNode } from 'react'
import { Command, ArrowBigUp } from 'lucide-react'
import { IS_MAC, type ShortcutOptions } from '../utils/shortcut'

/**
 * Render a shortcut chord as a row of individual keycaps.
 *
 * On macOS the Command and Shift keys render as the familiar glyph icons
 * (⌘, ⇧) so the chord is readable at a glance without relying on unicode
 * glyph fonts. On Windows/Linux the same modifier positions render as
 * small "Ctrl" / "Shift" text since there's no universal icon convention.
 *
 * The final key (e.g. "Enter", "N", "1–9") is always rendered as text.
 *
 * All keycaps share the `Keycap` style so the visual rhythm is consistent
 * regardless of platform or which modifiers are present.
 */
export interface ShortcutKeysProps {
  /** The final key after all modifiers, as display text. */
  chord: string
  /** Which modifiers to render, in canonical Mac order (⌃⌥⇧⌘). */
  opts?: ShortcutOptions
}

export function ShortcutKeys({ chord, opts = { mod: true } }: ShortcutKeysProps) {
  const keys: ReactNode[] = []

  // Display order matches what users write and say: "⌘⇧P", "Ctrl+Shift+P".
  // Platform mod (Cmd/Ctrl) comes first, then Shift → Option/Alt → Control
  // (Mac-only), then the letter key. Apple HIG uses the physical-keyboard
  // order (⌃⌥⇧⌘) but most modern Mac apps — Notion, Linear, Figma,
  // Raycast — put Command first, which is what users intuit.
  if (opts.mod) {
    keys.push(
      <Keycap key="mod" ariaLabel={IS_MAC ? 'Command' : 'Control'}>
        {IS_MAC ? <CommandGlyph /> : 'Ctrl'}
      </Keycap>
    )
  } else if (opts.ctrl && !IS_MAC) {
    // On Windows, ctrl without mod — still render a Ctrl cap
    keys.push(<Keycap key="ctrl-win" ariaLabel="Control">Ctrl</Keycap>)
  }
  if (opts.shift) keys.push(
    <Keycap key="shift" ariaLabel="Shift">
      {IS_MAC ? <ShiftGlyph /> : 'Shift'}
    </Keycap>
  )
  if (opts.alt) keys.push(<Keycap key="alt" ariaLabel={IS_MAC ? 'Option' : 'Alt'}>{IS_MAC ? '⌥' : 'Alt'}</Keycap>)
  if (opts.ctrl && IS_MAC) keys.push(<Keycap key="ctrl-mac" ariaLabel="Control">⌃</Keycap>)
  keys.push(<Keycap key="key" ariaLabel={chord}>{chord}</Keycap>)

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
      }}
    >
      {keys}
    </span>
  )
}

function Keycap({ children, ariaLabel }: { children: ReactNode; ariaLabel?: string }) {
  return (
    <kbd
      aria-label={ariaLabel}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 18,
        height: 18,
        padding: '0 5px',
        fontSize: 10,
        fontFamily: 'var(--font-mono)',
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: '0.01em',
        color: 'var(--text-primary)',
        background: 'var(--bg-input)',
        border: '1px solid var(--border-default)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'inset 0 -1px 0 rgba(0, 0, 0, 0.2)',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </kbd>
  )
}

/** ⌘ Command key — lucide's Command path, sized to fit a small keycap. */
function CommandGlyph() {
  return (
    <Command
      size={11}
      strokeWidth={1.75}
      aria-hidden
      style={{ display: 'block' }}
    />
  )
}

/** ⇧ Shift key — lucide's ArrowBigUp. */
function ShiftGlyph() {
  return (
    <ArrowBigUp
      size={12}
      strokeWidth={1.75}
      aria-hidden
      style={{ display: 'block' }}
    />
  )
}
