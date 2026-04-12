import { useState } from 'react'
import { Sun, Moon, Monitor, PanelLeft, PanelLeftClose } from 'lucide-react'
import { SettingsDialog } from '../Settings/SettingsDialog'
import { UpdateDialog } from './UpdateDialog'
import { AboutDialog } from './AboutDialog'
import { useSettingsStore } from '../../store/settings'
import { useUIStore } from '../../store/ui'
import { useUpdateCheck } from '../../hooks/useUpdateCheck'
import type { ThemeMode } from '../../../shared/types'
import { version } from '../../../package.json'

const nextTheme: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'system',
  system: 'dark'
}

const ThemeIcon = ({ theme }: { theme: ThemeMode }) => {
  const size = 14
  if (theme === 'light') return <Sun size={size} />
  if (theme === 'system') return <Monitor size={size} />
  return <Moon size={size} />
}

const isMac = window.navigator.platform.includes('Mac')

export function Header() {
  const settingsOpen = useUIStore((s) => s.settingsOpen)
  const closeSettings = useUIStore((s) => s.closeSettings)
  const collapsed = useUIStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useUIStore((s) => s.toggleSidebar)
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const update = useUpdateCheck()
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  return (
    <>
      <header
        className="flex items-center h-[38px] min-h-[38px] shrink-0 select-none"
        style={{
          WebkitAppRegion: 'drag',
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        } as React.CSSProperties}
      >
        {/* Left: traffic lights spacer (macOS only) + sidebar toggle */}
        {isMac && <div className="w-[70px] shrink-0" />}
        <div
          className="flex items-center shrink-0"
          style={{ WebkitAppRegion: 'no-drag', paddingLeft: isMac ? 4 : 8 } as React.CSSProperties}
        >
          <button
            onClick={toggleSidebar}
            className="toolbar-btn"
            title={collapsed ? 'Show sidebar' : 'Hide sidebar'}
          >
            {collapsed ? <PanelLeft size={15} /> : <PanelLeftClose size={15} />}
          </button>
        </div>

        <div className="flex-1" />

        {/* Center: title — absolute so it stays centered regardless of left/right content */}
        <button
          onClick={() => setAboutOpen(true)}
          style={{
            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            padding: '4px 10px', borderRadius: 'var(--radius-sm)',
            transition: 'background 150ms ease',
            WebkitAppRegion: 'no-drag',
          } as React.CSSProperties}
          onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)' }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
        >
          <span style={{
            fontFamily: 'var(--font-ui)',
            color: 'var(--text-primary)',
            fontSize: 13,
            fontWeight: 600,
          }}>
            nodl
          </span>
          <span style={{ color: 'var(--text-tertiary)', fontSize: 11 }}>
            v{version}
          </span>
        </button>

        {/* Right: update + theme toggle */}
        <div
          className="flex items-center gap-0.5 shrink-0 px-3"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          {update.available && (
            <button
              onClick={() => setUpdateDialogOpen(true)}
              className="animate-fade-in"
              title="Download latest version"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '3px 10px',
                fontSize: 11, fontWeight: 500,
                color: 'var(--accent-bright)',
                background: 'var(--accent-dim)',
                border: '1px solid rgba(167, 139, 250, 0.2)',
                borderRadius: 'var(--radius-sm)',
                cursor: 'pointer',
                transition: 'background 150ms ease, border-color 150ms ease',
                userSelect: 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(167, 139, 250, 0.16)'
                e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.35)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--accent-dim)'
                e.currentTarget.style.borderColor = 'rgba(167, 139, 250, 0.2)'
              }}
            >
              v{update.version} available
            </button>
          )}
          <button
            onClick={() => setTheme(nextTheme[theme])}
            className="toolbar-btn"
            title={`Theme: ${theme}`}
          >
            <ThemeIcon theme={theme} />
          </button>
        </div>
      </header>
      <SettingsDialog open={settingsOpen} onClose={closeSettings} />
      <UpdateDialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)} update={update} />
      <AboutDialog open={aboutOpen} onClose={() => setAboutOpen(false)} />
    </>
  )
}
