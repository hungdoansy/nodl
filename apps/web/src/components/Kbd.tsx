'use client'

import { ArrowBigUp, Command, CornerDownLeft } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

/**
 * Platform-aware keycap that mirrors the desktop app's ShortcutKeys
 * styling (apps/desktop/src/components/ShortcutKeys.tsx).
 *
 * On macOS the modifier renders as the lucide ⌘ glyph; on Windows/Linux
 * it falls back to a "Ctrl" text label. The platform is detected on
 * mount, so SSR renders the Mac variant by default and hydrates to the
 * correct glyph without a layout shift.
 */
type SpecialKey = 'mod' | 'shift' | 'enter'

type KbdProps = {
  /** A single character/word OR one of the special keys (`mod`, `shift`, `enter`). */
  k: string | SpecialKey
  size?: 'sm' | 'md'
}

export function Kbd({ k, size = 'sm' }: KbdProps) {
  const isMac = useIsMac()
  const dims =
    size === 'md'
      ? 'h-6 min-w-[24px] px-1.5 text-[12px]'
      : 'h-5 min-w-[20px] px-1 text-[11px]'

  let content: ReactNode = k
  let label = String(k)

  if (k === 'mod') {
    label = isMac ? 'Command' : 'Control'
    content = isMac ? (
      <Command size={size === 'md' ? 13 : 11} strokeWidth={1.75} />
    ) : (
      <span className="font-mono">Ctrl</span>
    )
  } else if (k === 'shift') {
    label = 'Shift'
    content = isMac ? (
      <ArrowBigUp size={size === 'md' ? 14 : 12} strokeWidth={1.75} />
    ) : (
      <span className="font-mono">Shift</span>
    )
  } else if (k === 'enter') {
    label = 'Enter'
    content = (
      <CornerDownLeft size={size === 'md' ? 12 : 10} strokeWidth={2} />
    )
  }

  return (
    <kbd
      aria-label={label}
      className={`inline-flex items-center justify-center rounded border border-border-default bg-bg-input font-mono font-medium leading-none text-text-primary shadow-[inset_0_-1px_0_rgba(0,0,0,0.25)] ${dims}`}
    >
      {content}
    </kbd>
  )
}

/**
 * Render a chord like ⌘⏎ as a row of keycaps.
 */
export function Chord({
  keys,
  size = 'sm'
}: {
  keys: Array<string | SpecialKey>
  size?: 'sm' | 'md'
}) {
  return (
    <span className="inline-flex items-center gap-1">
      {keys.map((k, i) => (
        <Kbd key={`${k}-${i}`} k={k} size={size} />
      ))}
    </span>
  )
}

/* ─── Platform detection (SSR-safe) ─────────────────────────────── */

let cachedIsMac: boolean | null = null

function detectIsMac(): boolean {
  if (typeof window === 'undefined') return true // SSR default
  const nav = window.navigator
  const uaData = (nav as Navigator & { userAgentData?: { platform?: string } })
    .userAgentData
  if (uaData?.platform) {
    return /mac/i.test(uaData.platform)
  }
  return /Mac|iPhone|iPad|iPod/i.test(nav.platform || nav.userAgent || '')
}

export function useIsMac(): boolean {
  // Default to Mac during SSR / first paint to avoid hydration mismatch
  // and a flash of the wrong glyph on Mac visitors (the dominant cohort
  // for a desktop dev tool).
  const [isMac, setIsMac] = useState(true)
  useEffect(() => {
    if (cachedIsMac === null) cachedIsMac = detectIsMac()
    setIsMac(cachedIsMac)
  }, [])
  return isMac
}
