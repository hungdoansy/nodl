type GridBackgroundProps = {
  className?: string
  cellSize?: number
}

/**
 * Subtle grid that fades to transparent at the edges via a radial mask.
 * Pure CSS — no JS. Decorative only.
 */
export function GridBackground({
  className = '',
  cellSize = 64
}: GridBackgroundProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)
        `,
        backgroundSize: `${cellSize}px ${cellSize}px`,
        WebkitMaskImage:
          'radial-gradient(ellipse 75% 60% at 50% 40%, black 30%, transparent 80%)',
        maskImage:
          'radial-gradient(ellipse 75% 60% at 50% 40%, black 30%, transparent 80%)'
      }}
    />
  )
}
