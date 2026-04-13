type RadialGlowProps = {
  className?: string
  size?: number // px
  /** CSS color for the glow centre. Defaults to the brand accent. */
  color?: string
  /** 0–1, peak alpha at the centre. */
  intensity?: number
  /** Optional ambient pulse (very slow, decorative). */
  pulse?: boolean
}

/**
 * Soft blurred disc — purely decorative accent halo for hero sections.
 * Position via the `className` prop (e.g. "left-1/2 top-1/3 -translate-x-1/2").
 */
export function RadialGlow({
  className = '',
  size = 720,
  color = '#a78bfa',
  intensity = 0.18,
  pulse = false
}: RadialGlowProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full ${
        pulse ? 'animate-glow-pulse' : ''
      } ${className}`}
      style={{
        width: size,
        height: size,
        background: `radial-gradient(circle, ${hexToRgba(color, intensity)} 0%, ${hexToRgba(color, 0)} 70%)`,
        filter: 'blur(40px)'
      }}
    />
  )
}

function hexToRgba(hex: string, alpha: number): string {
  // Support short/long hex; fall back to the value as-is for non-hex inputs.
  const match = hex.match(/^#?([0-9a-f]{3}|[0-9a-f]{6})$/i)
  if (!match) return hex
  let h = match[1]
  if (h.length === 3) {
    h = h
      .split('')
      .map((c) => c + c)
      .join('')
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
