import type { ReactNode } from 'react'

type WindowChromeProps = {
  title?: string
  children: ReactNode
  className?: string
}

/**
 * macOS-style window frame for wrapping product screenshots.
 * Mirrors the desktop app's hiddenInset title bar feel —
 * traffic lights left, optional centred title, edge-to-edge content area.
 */
export function WindowChrome({
  title,
  children,
  className = ''
}: WindowChromeProps) {
  return (
    <div
      className={`overflow-hidden rounded-lg border border-border-default bg-bg-surface shadow-dialog ${className}`}
    >
      {/* Title bar */}
      <div className="relative flex h-9 items-center border-b border-border-subtle bg-bg-elevated px-3.5">
        {/* Traffic lights */}
        <div
          className="flex items-center gap-2"
          aria-hidden="true"
          role="presentation"
        >
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
        </div>

        {title ? (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <span className="select-none text-[12px] font-medium tracking-tight text-text-tertiary">
              {title}
            </span>
          </div>
        ) : null}
      </div>

      {/* Content */}
      <div className="bg-bg-primary">{children}</div>
    </div>
  )
}
