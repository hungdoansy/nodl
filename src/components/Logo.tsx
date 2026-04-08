interface LogoProps {
  size?: number
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Outer frame — squared, terminal-style */}
      <rect x="0.5" y="0.5" width="23" height="23" stroke="#00ffc8" strokeOpacity="0.4" strokeWidth="1" />
      {/* Inner glow rect */}
      <rect x="3" y="3" width="18" height="18" fill="#00ffc8" fillOpacity="0.08" />
      {/* Corner ticks */}
      <line x1="0" y1="6" x2="3" y2="6" stroke="#00ffc8" strokeOpacity="0.3" />
      <line x1="6" y1="0" x2="6" y2="3" stroke="#00ffc8" strokeOpacity="0.3" />
      <line x1="24" y1="6" x2="21" y2="6" stroke="#00ffc8" strokeOpacity="0.3" />
      <line x1="18" y1="0" x2="18" y2="3" stroke="#00ffc8" strokeOpacity="0.3" />
      <line x1="0" y1="18" x2="3" y2="18" stroke="#00ffc8" strokeOpacity="0.3" />
      <line x1="6" y1="24" x2="6" y2="21" stroke="#00ffc8" strokeOpacity="0.3" />
      <line x1="24" y1="18" x2="21" y2="18" stroke="#00ffc8" strokeOpacity="0.3" />
      <line x1="18" y1="24" x2="18" y2="21" stroke="#00ffc8" strokeOpacity="0.3" />
      {/* Letter */}
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, Monaco, monospace"
        fontWeight="700"
        fontSize="14"
        fill="#00ffc8"
      >
        n
      </text>
    </svg>
  )
}
