import { useEffect } from 'react'
import { useTabsStore } from '../store/tabs'
import { useUIStore } from '../store/ui'
import { useOutputStore } from '../store/output'
import { useSettingsStore } from '../store/settings'
import { useCodeExecution } from './useCodeExecution'
import { entriesToText } from '../utils/outputToText'
import * as bridge from '../ipc/bridge'

export function useKeyboardShortcuts() {
  const { run } = useCodeExecution()

  useEffect(() => {
    /** Mark this chord as consumed — prevents browser default AND stops
     * propagation so Monaco (and other inner handlers) never sees it. */
    function consume(e: KeyboardEvent) {
      e.preventDefault()
      e.stopPropagation()
    }

    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey
      if (!mod) return

      // ─── Shift-modifier chords (more specific — check first) ─────────
      if (e.shiftKey) {
        // Cmd+Shift+C — copy output to clipboard
        if (e.key === 'C' || e.key === 'c') {
          consume(e)
          const state = useOutputStore.getState()
          const entries = state.outputs[state.activeTabId]?.entries ?? []
          if (entries.length > 0) {
            navigator.clipboard.writeText(entriesToText(entries)).catch(() => { /* ignore */ })
          }
          return
        }

        // Cmd+Shift+M — toggle output mode
        if (e.key === 'M' || e.key === 'm') {
          consume(e)
          useUIStore.getState().toggleOutputMode()
          return
        }

        // Cmd+Shift+A — toggle auto-run
        if (e.key === 'A' || e.key === 'a') {
          consume(e)
          const { autoRunEnabled, setSetting } = useSettingsStore.getState()
          setSetting('autoRunEnabled', !autoRunEnabled)
          return
        }

        return
      }

      // ─── Plain mod chords ─────────────────────────────────────────────

      // Cmd+S — force save + toast feedback
      if (e.key === 's') {
        consume(e)
        const { tabs, activeTabId } = useTabsStore.getState()
        bridge.saveState({ version: 1, tabs, activeTabId })
        useUIStore.getState().markSaved()
        return
      }

      // Cmd+L — clear output (Chrome DevTools convention)
      if (e.key === 'l') {
        consume(e)
        useOutputStore.getState().clear()
        return
      }

      // Cmd+P — toggle packages dialog
      if (e.key === 'p') {
        consume(e)
        useUIStore.getState().togglePackages()
        return
      }

      // Cmd+N — new tab
      if (e.key === 'n') {
        consume(e)
        useTabsStore.getState().createTab()
        return
      }

      // Cmd+W — close active tab
      if (e.key === 'w') {
        consume(e)
        const { activeTabId, closeTab } = useTabsStore.getState()
        closeTab(activeTabId)
        return
      }

      // Cmd+, — open settings
      if (e.key === ',') {
        consume(e)
        useUIStore.getState().toggleSettings()
        return
      }

      // Cmd+Enter — run code (Monaco also handles this, this is the global fallback)
      if (e.key === 'Enter') {
        consume(e)
        run()
        return
      }

      // Cmd+1–9 — switch to tab N
      const num = parseInt(e.key, 10)
      if (num >= 1 && num <= 9) {
        consume(e)
        const tabs = useTabsStore.getState().tabs
        const index = num - 1
        if (index < tabs.length) {
          useTabsStore.getState().setActiveTab(tabs[index].id)
        }
        return
      }
    }

    // Capture phase: we see the event before Monaco and other inner handlers,
    // so Cmd+K (Monaco chord prefix), Cmd+Shift+P (command palette), etc.
    // resolve to our bindings even when the editor has focus. We only
    // preventDefault on chords we match; other events keep flowing.
    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [run])
}
