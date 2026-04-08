interface LogoProps {
  size?: number
}

export function Logo({ size = 20 }: LogoProps) {
  const r = size * 0.25 // corner radius scales with size
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Glow layer */}
      <rect width="24" height="24" rx={r} fill="url(#logo-glow)" opacity="0.4" />
      {/* Main shape */}
      <rect width="24" height="24" rx={r} fill="url(#logo-gradient)" />
      {/* Letter */}
      <text
        x="12"
        y="17.5"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, Monaco, monospace"
        fontWeight="800"
        fontSize="16"
        fill="#0c0c0e"
        letterSpacing="-0.5"
      >
        n
      </text>
      <defs>
        <linearGradient id="logo-gradient" x1="0" y1="0" x2="24" y2="24">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#10b981" />
        </linearGradient>
        <radialGradient id="logo-glow" cx="0.5" cy="0.5" r="0.5">
          <stop stopColor="#34d399" />
          <stop offset="1" stopColor="#34d399" stopOpacity="0" />
        </radialGradient>
      </defs>
    </svg>
  )
}
