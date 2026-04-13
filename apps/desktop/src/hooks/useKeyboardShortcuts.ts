import { useEffect } from 'react'
import { useTabsStore } from '../store/tabs'
import { useUIStore } from '../store/ui'
import { useCodeExecution } from './useCodeExecution'
import * as bridge from '../ipc/bridge'

export function useKeyboardShortcuts() {
  const { run } = useCodeExecution()

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey

      if (!mod) return

      // Cmd+S — force save now + show toast feedback. Persistence is also
      // auto-debounced, so this is primarily about user expectation: when
      // someone hits Cmd+S they want confirmation their work is safe.
      if (e.key === 's' && !e.shiftKey) {
        e.preventDefault()
        const { tabs, activeTabId } = useTabsStore.getState()
        bridge.saveState({ version: 1, tabs, activeTabId })
        useUIStore.getState().markSaved()
        return
      }

      // Cmd+N — new tab
      if (e.key === 'n' && !e.shiftKey) {
        e.preventDefault()
        useTabsStore.getState().createTab()
        return
      }

      // Cmd+W — close active tab
      if (e.key === 'w' && !e.shiftKey) {
        e.preventDefault()
        const { activeTabId, closeTab } = useTabsStore.getState()
        closeTab(activeTabId)
        return
      }

      // Cmd+, — open settings
      if (e.key === ',') {
        e.preventDefault()
        useUIStore.getState().toggleSettings()
        return
      }

      // Cmd+Enter — run code (also handled by Monaco, but this catches it globally)
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        run()
        return
      }

      // Cmd+1-9 — switch to tab N
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 9) {
        e.preventDefault()
        const tabs = useTabsStore.getState().tabs
        const index = num - 1
        if (index < tabs.length) {
          useTabsStore.getState().setActiveTab(tabs[index].id)
        }
        return
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [run])
}
