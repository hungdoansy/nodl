import { useModifierHeld } from '../hooks/useModifierHeld'
import { SHORTCUTS, type ShortcutDef } from '../config/shortcuts'
import { IS_MAC, shortcut } from '../utils/shortcut'

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
        padding: '10px 14px',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-dialog)',
        display: 'grid',
        gridTemplateColumns: 'auto 1fr',
        columnGap: 14,
        rowGap: 6,
        alignItems: 'center',
        pointerEvents: 'none',
        userSelect: 'none',
        animation: 'nodl-hint-fade-in 120ms ease',
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
          marginBottom: 2,
        }}
      >
        Keep holding {IS_MAC ? '⌘' : 'Ctrl'} — then press…
      </div>
      {SHORTCUTS.map((s) => (
        <ShortcutRow key={`${s.display}-${s.opts?.shift ? 'shift' : ''}`} def={s} />
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
  // Range display (1–9) isn't a real chord — format manually
  const chord = def.display === '1–9'
    ? (IS_MAC ? '⌘1–9' : 'Ctrl+1–9')
    : shortcut(def.display, def.opts ?? { mod: true })
  return (
    <>
      <kbd
        style={{
          justifySelf: 'start',
          padding: '2px 7px',
          fontSize: 11,
          fontFamily: 'var(--font-mono)',
          color: 'var(--text-primary)',
          background: 'var(--bg-input)',
          border: '1px solid var(--border-default)',
          borderRadius: 'var(--radius-sm)',
          whiteSpace: 'nowrap',
        }}
      >
        {chord}
      </kbd>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{def.label}</span>
    </>
  )
}
