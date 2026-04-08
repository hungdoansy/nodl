import { SettingsDialog } from '../Settings/SettingsDialog'
import { Logo } from '../Logo'
import { useSettingsStore } from '../../store/settings'
import { useUIStore } from '../../store/ui'
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
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const openSettings = useUIStore((s) => s.openSettings)
  const closeSettings = useUIStore((s) => s.closeSettings)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <>
      <header
        className="flex items-center h-[38px] select-none border-b"
        style={{
          WebkitAppRegion: 'drag',
          background: 'var(--bg-elevated)',
          borderColor: 'var(--border-default)'
        } as React.CSSProperties}
      >
        {/* Left spacer — balances the right buttons for centering (macOS traffic lights ~70px) */}
        <div className="w-[70px] shrink-0" />

        {/* Center: logo + app name */}
        <div className="flex-1 flex items-center justify-center gap-1.5">
          <Logo size={18} />
          <span className="text-[13px] font-semibold text-zinc-100 tracking-tight">nodl</span>
        </div>

        {/* Right: theme + settings */}
        <div
          className="flex items-center gap-0.5 px-2 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setTheme(nextTheme[theme])}
            className="p-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 transition-colors rounded"
            title={`Theme: ${theme}`}
          >
            {themeIcons[theme]}
          </button>
          <button
            onClick={openSettings}
            className="p-1.5 text-sm text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 active:bg-zinc-700 transition-colors rounded"
            title="Settings"
          >
            &#9881;
          </button>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onClose={closeSettings} />
    </>
  )
}
