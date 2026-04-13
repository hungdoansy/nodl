'use client'

import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme, type ThemeMode } from '@/lib/theme'

const NEXT_LABEL: Record<ThemeMode, string> = {
  dark: 'Switch to light',
  light: 'Switch to system',
  system: 'Switch to dark'
}

const CURRENT_LABEL: Record<ThemeMode, string> = {
  dark: 'Dark',
  light: 'Light',
  system: 'System'
}

type ThemeToggleProps = {
  /** Compact button used in the sticky site header. */
  variant?: 'header' | 'pill'
}

export function ThemeToggle({ variant = 'header' }: ThemeToggleProps) {
  const { mode, cycle } = useTheme()

  const Icon = mode === 'light' ? Sun : mode === 'system' ? Monitor : Moon
  const title = `Theme: ${CURRENT_LABEL[mode]} — ${NEXT_LABEL[mode]}`

  if (variant === 'pill') {
    return (
      <button
        type="button"
        onClick={cycle}
        title={title}
        aria-label={title}
        className="inline-flex h-7 w-7 items-center justify-center rounded text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
      >
        <Icon size={14} />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={cycle}
      title={title}
      aria-label={title}
      className="inline-flex h-8 w-8 items-center justify-center rounded-sm text-text-tertiary transition-colors hover:bg-bg-hover hover:text-text-primary"
    >
      <Icon size={15} />
    </button>
  )
}
