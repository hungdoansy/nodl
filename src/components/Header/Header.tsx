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
        className="flex items-center h-[38px] select-none relative z-10"
        style={{
          WebkitAppRegion: 'drag',
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border-subtle)',
        } as React.CSSProperties}
      >
        {/* Left spacer for macOS traffic lights */}
        <div className="w-[70px] shrink-0" />

        {/* Center: logo + app name */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <Logo size={18} />
          <span
            className="text-[13px] font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
            nodl
          </span>
        </div>

        {/* Right: theme + settings */}
        <div
          className="flex items-center gap-1 px-2.5 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setTheme(nextTheme[theme])}
            className="btn-ghost text-sm"
            title={`Theme: ${theme}`}
          >
            {themeIcons[theme]}
          </button>
          <button
            onClick={openSettings}
            className="btn-ghost text-sm"
            title="Settings"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 4.754a3.246 3.246 0 1 0 0 6.492 3.246 3.246 0 0 0 0-6.492zM5.754 8a2.246 2.246 0 1 1 4.492 0 2.246 2.246 0 0 1-4.492 0z"/>
              <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 1-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 1-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 1 .52 1.255l-.16.292c-.892 1.64.901 3.434 2.541 2.54l.292-.159a.873.873 0 0 1 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 1 1.255-.52l.292.16c1.64.893 3.434-.902 2.54-2.541l-.159-.292a.873.873 0 0 1 .52-1.255l.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 1-.52-1.255l.16-.292c.893-1.64-.902-3.433-2.541-2.54l-.292.159a.873.873 0 0 1-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.415 1.6.42 1.184 1.185l-.159.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.319.094a1.873 1.873 0 0 0-1.115 2.693l.16.291c.415.764-.421 1.6-1.185 1.184l-.291-.159a1.873 1.873 0 0 0-2.693 1.116l-.094.318c-.246.835-1.428.835-1.674 0l-.094-.319a1.873 1.873 0 0 0-2.692-1.115l-.292.16c-.764.415-1.6-.421-1.184-1.185l.159-.291A1.873 1.873 0 0 0 1.945 8.93l-.319-.094c-.835-.246-.835-1.428 0-1.674l.319-.094A1.873 1.873 0 0 0 3.06 4.377l-.16-.292c-.415-.764.42-1.6 1.185-1.184l.292.159a1.873 1.873 0 0 0 2.692-1.115l.094-.319z"/>
            </svg>
          </button>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onClose={closeSettings} />
    </>
  )
}
