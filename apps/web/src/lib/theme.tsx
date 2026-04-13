'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from 'react'

export type ThemeMode = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'

const STORAGE_KEY = 'nodl.theme'

type ThemeContextValue = {
  mode: ThemeMode
  resolved: ResolvedTheme
  setMode: (mode: ThemeMode) => void
  cycle: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

const ORDER: ThemeMode[] = ['dark', 'light', 'system']

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('dark')
  const [systemPref, setSystemPref] = useState<ResolvedTheme>('dark')

  // First render — read persisted preference (the no-flash script in
  // <head> already applied the matching class, so we just sync state).
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      if (stored && ORDER.includes(stored)) setModeState(stored)
    } catch {}
    const mq = window.matchMedia('(prefers-color-scheme: light)')
    const sync = () => setSystemPref(mq.matches ? 'light' : 'dark')
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const resolved: ResolvedTheme = mode === 'system' ? systemPref : mode

  // Apply class to <html> whenever the resolved theme changes
  useEffect(() => {
    const root = document.documentElement
    root.classList.remove('light', 'dark')
    root.classList.add(resolved)
  }, [resolved])

  const setMode = useCallback((next: ThemeMode) => {
    setModeState(next)
    try {
      window.localStorage.setItem(STORAGE_KEY, next)
    } catch {}
  }, [])

  const cycle = useCallback(() => {
    setModeState((current) => {
      const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length]
      try {
        window.localStorage.setItem(STORAGE_KEY, next)
      } catch {}
      return next
    })
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ mode, resolved, setMode, cycle }),
    [mode, resolved, setMode, cycle]
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    // Fallback for any consumer outside the provider — safe-default to dark.
    return {
      mode: 'dark',
      resolved: 'dark',
      setMode: () => {},
      cycle: () => {}
    }
  }
  return ctx
}

/**
 * Inline `<head>` script (string) that applies the persisted theme class
 * to <html> BEFORE first paint, preventing a dark↔light flash. Must be
 * injected synchronously via `dangerouslySetInnerHTML`.
 */
export const NO_FLASH_SCRIPT = `(() => {
  try {
    var k = '${STORAGE_KEY}';
    var m = localStorage.getItem(k) || 'dark';
    var t = (m === 'system')
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : m;
    var c = document.documentElement.classList;
    c.remove('light', 'dark');
    c.add(t === 'light' ? 'light' : 'dark');
  } catch (_) {}
})();`
