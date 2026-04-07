import { useEffect } from 'react'
import { useSettingsStore } from '../store/settings'
import type { ThemeMode } from '../../shared/types'

function getResolvedTheme(mode: ThemeMode): 'dark' | 'light' {
  if (mode === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  }
  return mode
}

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme)

  useEffect(() => {
    function apply() {
      const resolved = getResolvedTheme(theme)
      const root = document.documentElement
      root.classList.remove('dark', 'light')
      root.classList.add(resolved)

      // Update body background for the theme
      document.body.style.backgroundColor = resolved === 'dark' ? '#18181b' : '#fafafa'
      document.body.style.color = resolved === 'dark' ? '#f4f4f5' : '#18181b'
    }

    apply()

    // Listen for system theme changes when mode is 'system'
    if (theme === 'system') {
      const mq = window.matchMedia('(prefers-color-scheme: dark)')
      const handler = () => apply()
      mq.addEventListener('change', handler)
      return () => mq.removeEventListener('change', handler)
    }
  }, [theme])

  return getResolvedTheme(theme)
}
