import { useEffect } from 'react'
import { useTabsStore } from '../store/tabs'
import { useSettingsStore } from '../store/settings'
import { useUIStore } from '../store/ui'
import { useCodeExecution } from './useCodeExecution'
import * as bridge from '../ipc/bridge'
import type { ThemeMode } from '../../shared/types'

const nextTheme: Record<ThemeMode, ThemeMode> = {
  dark: 'light',
  light: 'system',
  system: 'dark'
}

export function useMenuEvents() {
  const { run } = useCodeExecution()

  useEffect(() => {
    const unsubs = [
      bridge.onMenuNewTab(() => {
        useTabsStore.getState().createTab()
      }),
      bridge.onMenuCloseTab(() => {
        const { activeTabId, closeTab } = useTabsStore.getState()
        closeTab(activeTabId)
      }),
      bridge.onMenuRunCode(() => {
        run()
      }),
      bridge.onMenuToggleSettings(() => {
        useUIStore.getState().toggleSettings()
      }),
      bridge.onMenuToggleTheme(() => {
        const current = useSettingsStore.getState().theme
        useSettingsStore.getState().setTheme(nextTheme[current])
      })
    ]

    return () => unsubs.forEach((fn) => fn())
  }, [run])
}
