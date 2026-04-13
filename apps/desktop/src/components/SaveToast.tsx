import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { useUIStore } from '../store/ui'

const VISIBLE_MS = 1000

/**
 * Brief "Saved" confirmation that fades in when ui.savedAt is bumped.
 * The bump happens on Cmd/Ctrl+S — persistence is already auto-debounced,
 * so this is about giving the user tactile feedback that their save
 * request was acknowledged.
 */
export function SaveToast() {
  const savedAt = useUIStore((s) => s.savedAt)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!savedAt) return
    setVisible(true)
    const timer = setTimeout(() => setVisible(false), VISIBLE_MS)
    return () => clearTimeout(timer)
  }, [savedAt])

  if (!visible) return null

  return (
    <div
      style={{
        position: 'fixed',
        top: 52,
        right: 16,
        zIndex: 90,
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '5px 10px',
        fontSize: 11,
        fontWeight: 500,
        color: 'var(--ok)',
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-sm)',
        boxShadow: 'var(--shadow-sm)',
        pointerEvents: 'none',
        userSelect: 'none',
        animation: 'nodl-save-toast 180ms var(--ease)',
      }}
      role="status"
      aria-live="polite"
    >
      <Check size={12} />
      Saved
      <style>{`
        @keyframes nodl-save-toast {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
