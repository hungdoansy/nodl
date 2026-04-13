type LogomarkProps = {
  size?: number
  className?: string
}

/**
 * The nodl logomark — a small rounded violet square with a subtle inner glyph.
 * Pure SVG, scales by `size`. Used in Header + Footer + favicon fallback.
 */
export function Logomark({ size = 18, className = '' }: LogomarkProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="24" height="24" rx="6" fill="#a78bfa" />
      {/* Stylised "n" */}
      <path
        d="M7 17V9.5C7 9.224 7.224 9 7.5 9H9C9.276 9 9.5 9.224 9.5 9.5V11"
        stroke="#171717"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M14.5 17V11.5C14.5 10.119 13.381 9 12 9C10.619 9 9.5 10.119 9.5 11.5V17"
        stroke="#171717"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="17" cy="17" r="1.2" fill="#171717" />
    </svg>
  )
}
