import { useEffect, useRef } from 'react'
import { useTabsStore } from '../store/tabs'
import { useSettingsStore } from '../store/settings'
import * as bridge from '../ipc/bridge'
import type { PersistedState, AppSettings } from '../../shared/types'

const SAVE_DELAY = 500

export function usePersistence() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const restoreTabs = useTabsStore((s) => s.restoreTabs)
  const restoreSettings = useSettingsStore((s) => s.restoreSettings)

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const settingsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Collect all settings values for save trigger
  const fontSize = useSettingsStore((s) => s.fontSize)
  const tabSize = useSettingsStore((s) => s.tabSize)
  const wordWrap = useSettingsStore((s) => s.wordWrap)
  const minimap = useSettingsStore((s) => s.minimap)
  const autoRunEnabled = useSettingsStore((s) => s.autoRunEnabled)
  const autoRunDelay = useSettingsStore((s) => s.autoRunDelay)
  const executionTimeout = useSettingsStore((s) => s.executionTimeout)
  const theme = useSettingsStore((s) => s.theme)

  // Load state on mount
  useEffect(() => {
    Promise.all([bridge.loadState(), bridge.loadSettings()]).then(([state, settings]) => {
      if (state?.tabs?.length) {
        restoreTabs(state.tabs, state.activeTabId)
      }
      if (settings) {
        restoreSettings(settings)
      }
      initializedRef.current = true
    })
  }, [restoreTabs, restoreSettings])

  // Save tabs on changes (debounced)
  useEffect(() => {
    if (!initializedRef.current) return

    if (timerRef.current) clearTimeout(timerRef.current)

    timerRef.current = setTimeout(() => {
      const state: PersistedState = {
        version: 1,
        tabs,
        activeTabId
      }
      bridge.saveState(state)
    }, SAVE_DELAY)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [tabs, activeTabId])

  // Save settings on changes (debounced)
  useEffect(() => {
    if (!initializedRef.current) return

    if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current)

    settingsTimerRef.current = setTimeout(() => {
      const settings: AppSettings = {
        fontSize, tabSize, wordWrap, minimap,
        autoRunEnabled, autoRunDelay, executionTimeout, theme
      }
      bridge.saveSettings(settings)
    }, SAVE_DELAY)

    return () => {
      if (settingsTimerRef.current) clearTimeout(settingsTimerRef.current)
    }
  }, [fontSize, tabSize, wordWrap, minimap, autoRunEnabled, autoRunDelay, executionTimeout, theme])
}
