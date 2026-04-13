import { useState } from 'react'
import { useUIStore } from '../store/ui'

/**
 * Tiny "Saved ✓" confirmation that appears next to the Auto-run button
 * when ⌘S is pressed. Self-contained animation timeline:
 *
 *   0   → 120ms   pill fades in + slides up
 *   130 → 470ms   check-mark strokes itself in
 *   200 → 620ms   "Saved" label slides in from the left
 *   ~930ms        hold (fully drawn)
 *   ~1200ms       pill fades out
 *
 * The whole thing is driven by one CSS keyframe on the root (`saved-life`),
 * with nested keyframes on the check path and label for the draw-in and
 * slide-in. When the root animation finishes we unmount via onAnimationEnd,
 * so the badge never sits invisibly in the DOM.
 *
 * Re-triggering (rapid ⌘S) uses `savedAt` as the React key, which forces
 * a remount and restarts the full timeline cleanly.
 */
export function SavedBadge() {
  const savedAt = useUIStore((s) => s.savedAt)
  const [dismissedAt, setDismissedAt] = useState(0)

  if (!savedAt || savedAt <= dismissedAt) return null

  return (
    <span
      key={savedAt}
      className="saved-badge"
      role="status"
      aria-live="polite"
      onAnimationEnd={(e) => {
        // The root element owns the `saved-life` animation; inner
        // animations also bubble an animationend event, so filter by name.
        if (e.animationName === 'saved-life') setDismissedAt(savedAt)
      }}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        height: 18,
        padding: '0 7px 0 6px',
        fontSize: 10,
        fontWeight: 500,
        letterSpacing: '0.015em',
        color: 'var(--ok)',
        background: 'color-mix(in srgb, var(--ok) 10%, transparent)',
        border: '1px solid color-mix(in srgb, var(--ok) 28%, transparent)',
        borderRadius: 'var(--radius-sm)',
        pointerEvents: 'none',
        userSelect: 'none',
        whiteSpace: 'nowrap',
        marginLeft: 4,
      }}
    >
      <svg
        className="saved-badge__check"
        width={10}
        height={10}
        viewBox="0 0 10 10"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M1.5 5.2 L4 7.4 L8.5 2.8" pathLength={1} />
      </svg>
      <span className="saved-badge__label">Saved</span>
    </span>
  )
}
