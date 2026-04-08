interface LogoProps {
  size?: number
}

export function Logo({ size = 20 }: LogoProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="24" height="24" rx="6" fill="#10b981" />
      <text
        x="12"
        y="17"
        textAnchor="middle"
        fontFamily="Menlo, Monaco, monospace"
        fontWeight="700"
        fontSize="15"
        fill="#18181b"
      >
        n
      </text>
    </svg>
  )
}
