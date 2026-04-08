import { SettingsDialog } from '../Settings/SettingsDialog'
import { Logo } from '../Logo'
import { useSettingsStore } from '../../store/settings'
import { useUIStore } from '../../store/ui'
import type { ThemeMode } from '../../../shared/types'

const themeLabels: Record<ThemeMode, string> = {
  dark: 'DRK',
  light: 'LGT',
  system: 'SYS'
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
        className="flex items-center h-[36px] select-none"
        style={{
          WebkitAppRegion: 'drag',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-default)',
        } as React.CSSProperties}
      >
        {/* macOS traffic lights spacer */}
        <div className="w-[70px] shrink-0" />

        {/* Center: logo + name */}
        <div className="flex-1 flex items-center justify-center gap-2">
          <Logo size={16} />
          <span style={{ color: 'var(--accent)', fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            nodl
          </span>
          <span style={{ color: 'var(--text-muted)', fontSize: 10 }}>
            //&nbsp;v0.1.0
          </span>
        </div>

        {/* Right controls */}
        <div
          className="flex items-center gap-1 px-2 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setTheme(nextTheme[theme])}
            className="btn-ghost"
            style={{ fontSize: 10, letterSpacing: '0.06em' }}
            title={`Theme: ${theme}`}
          >
            <span style={{ color: 'var(--accent)', opacity: 0.6 }}>[</span>
            {themeLabels[theme]}
            <span style={{ color: 'var(--accent)', opacity: 0.6 }}>]</span>
          </button>
          <button
            onClick={openSettings}
            className="btn-ghost"
            style={{ fontSize: 10, letterSpacing: '0.06em' }}
            title="Settings"
          >
            <span style={{ color: 'var(--accent)', opacity: 0.6 }}>[</span>
            CFG
            <span style={{ color: 'var(--accent)', opacity: 0.6 }}>]</span>
          </button>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onClose={closeSettings} />
    </>
  )
}
