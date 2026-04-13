import { useModifierHeld } from '../hooks/useModifierHeld'
import { SHORTCUTS, type ShortcutDef } from '../config/shortcuts'
import { IS_MAC } from '../utils/shortcut'
import { ShortcutKeys } from './ShortcutKeys'

/**
 * Shown when the user holds the platform modifier key (⌘ / Ctrl) for
 * HINT_DELAY_MS. Lists available shortcut chords so they can complete one.
 * Disappears the moment the modifier is released or a chord is pressed.
 */
export function ShortcutHintOverlay() {
  const visible = useModifierHeld()

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 24,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 100,
        padding: '11px 16px 12px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-dialog)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 14,
        rowGap: 7,
        alignItems: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
        animation: 'nodl-hint-fade-in 140ms cubic-bezier(0.22, 1, 0.36, 1)',
      }}
      role="tooltip"
      aria-label="Keyboard shortcuts"
    >
      <div
        style={{
          gridColumn: '1 / -1',
          fontSize: 10,
          fontWeight: 500,
          letterSpacing: '0.04em',
          textTransform: 'uppercase',
          color: 'var(--text-tertiary)',
          marginBottom: 3,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        Keep holding {IS_MAC ? 'Command' : 'Ctrl'} — then press…
      </div>
      {SHORTCUTS.map((def) => (
        <ShortcutRow key={`${def.display}-${def.opts?.shift ? 'shift' : ''}`} def={def} />
      ))}
      <style>{`
        @keyframes nodl-hint-fade-in {
          from { opacity: 0; transform: translate(-50%, 4px); }
          to   { opacity: 1; transform: translate(-50%, 0); }
        }
      `}</style>
    </div>
  )
}

function ShortcutRow({ def }: { def: ShortcutDef }) {
  // "1–9" is a pseudo-chord: render ⌘1 with the label "Switch to tab 1…9"
  // (the keycap can't show a range cleanly, and the label is the right
  // place for the range notation anyway).
  const chord = def.display === '1–9' ? '1' : def.display
  const label = def.display === '1–9' ? 'Switch to tab (1–9)' : def.label

  return (
    <>
      <span style={{ justifySelf: 'start' }}>
        <ShortcutKeys chord={chord} opts={def.opts ?? { mod: true }} />
      </span>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.2 }}>
        {label}
      </span>
    </>
  )
}
