import { useState } from 'react'
import { TabBar } from './TabBar'
import { SettingsDialog } from '../Settings/SettingsDialog'
import { useSettingsStore } from '../../store/settings'
import type { ThemeMode } from '../../../shared/types'

const themeIcons: Record<ThemeMode, string> = {
  dark: '\u263D',
  light: '\u2600',
  system: '\u25D1'
}

const nextTheme: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'system',
  system: 'dark'
}

export function Header() {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <>
      <header
        className="flex items-center bg-zinc-800 dark:bg-zinc-800 border-b border-zinc-700 dark:border-zinc-700 select-none"
        style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
      >
        <div
          className="flex items-center gap-2 px-3 py-1.5 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <span className="text-sm font-bold text-zinc-100 tracking-tight">nodl</span>
        </div>
        <div
          className="flex-1 overflow-hidden"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <TabBar />
        </div>
        <div
          className="flex items-center gap-1 px-2 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setTheme(nextTheme[theme])}
            className="p-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-700"
            title={`Theme: ${theme} (click to cycle)`}
          >
            {themeIcons[theme]}
          </button>
          <button
            onClick={() => setSettingsOpen(true)}
            className="p-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors rounded hover:bg-zinc-700"
            title="Settings (Cmd+,)"
          >
            &#9881;
          </button>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </>
  )
}
