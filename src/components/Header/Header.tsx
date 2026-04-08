import { SettingsDialog } from '../Settings/SettingsDialog'
import { Logo } from '../Logo'
import { useSettingsStore } from '../../store/settings'
import { useUIStore } from '../../store/ui'
import type { ThemeMode } from '../../../shared/types'

const nextTheme: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'system',
  system: 'dark'
}

const themeLabel: Record<ThemeMode, string> = {
  dark: 'dark',
  light: 'light',
  system: 'sys'
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
        className="flex items-center h-[34px] select-none"
        style={{
          WebkitAppRegion: 'drag',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        } as React.CSSProperties}
      >
        <div className="w-[70px] shrink-0" />

        <div className="flex-1 flex items-center justify-center gap-2">
          <Logo size={15} />
          <span style={{
            color: 'var(--accent)',
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
          }}>
            nodl
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>v0.1</span>
        </div>

        <div
          className="flex items-center gap-0.5 px-2 shrink-0"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => setTheme(nextTheme[theme])}
            className="btn-ghost"
            style={{ fontSize: 9, letterSpacing: '0.06em' }}
            title={`Theme: ${theme}`}
          >
            {themeLabel[theme]}
          </button>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 9 }}>·</span>
          <button
            onClick={openSettings}
            className="btn-ghost"
            style={{ fontSize: 9, letterSpacing: '0.06em' }}
            title="Settings"
          >
            config
          </button>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onClose={closeSettings} />
    </>
  )
}
