interface LogoProps {
  size?: number
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Frame */}
      <rect x="1" y="1" width="22" height="22" stroke="#a78bfa" strokeOpacity="0.3" strokeWidth="1" />
      {/* Inner fill */}
      <rect x="4" y="4" width="16" height="16" fill="#a78bfa" fillOpacity="0.06" />
      {/* Corner marks */}
      <path d="M1 5V1H5" stroke="#a78bfa" strokeOpacity="0.5" strokeWidth="1" fill="none" />
      <path d="M23 5V1H19" stroke="#a78bfa" strokeOpacity="0.5" strokeWidth="1" fill="none" />
      <path d="M1 19V23H5" stroke="#a78bfa" strokeOpacity="0.5" strokeWidth="1" fill="none" />
      <path d="M23 19V23H19" stroke="#a78bfa" strokeOpacity="0.5" strokeWidth="1" fill="none" />
      {/* Letter */}
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="ui-monospace, Menlo, Monaco, monospace"
        fontWeight="700"
        fontSize="14"
        fill="#a78bfa"
      >
        n
      </text>
    </svg>
  )
}
