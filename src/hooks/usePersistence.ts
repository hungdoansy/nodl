import { useEffect, useRef } from 'react'
import { useTabsStore } from '../store/tabs'
import * as bridge from '../ipc/bridge'
import type { PersistedState } from '../../shared/types'

const SAVE_DELAY = 500

export function usePersistence() {
  const tabs = useTabsStore((s) => s.tabs)
  const activeTabId = useTabsStore((s) => s.activeTabId)
  const restoreTabs = useTabsStore((s) => s.restoreTabs)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const initializedRef = useRef(false)

  // Load state on mount
  useEffect(() => {
    bridge.loadState().then((state) => {
      if (state?.tabs?.length) {
        restoreTabs(state.tabs, state.activeTabId)
      }
      initializedRef.current = true
    })
  }, [restoreTabs])

  // Save state on changes (debounced)
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
}
