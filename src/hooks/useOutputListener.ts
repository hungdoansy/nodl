import { useEffect } from 'react'
import { useOutputStore } from '../store/output'
import { useTabsStore } from '../store/tabs'
import * as bridge from '../ipc/bridge'

/**
 * Subscribes to IPC output events exactly once at the App level.
 * Must be called from a single component (App.tsx) to avoid duplicate listeners.
 */
export function useOutputListener() {
  const setActiveTabId = useOutputStore((s) => s.setActiveTabId)
  const activeTabId = useTabsStore((s) => s.activeTabId)

  // Sync active tab ID to output store
  useEffect(() => {
    setActiveTabId(activeTabId)
  }, [activeTabId, setActiveTabId])

  // Subscribe to IPC events — stable refs, subscribe once
  useEffect(() => {
    const unsubOutput = bridge.onOutputEntry((entry) => {
      useOutputStore.getState().addEntry(entry)
    })
    const unsubDone = bridge.onExecutionDone((result) => {
      useOutputStore.getState().setDone(result)
    })
    return () => {
      unsubOutput()
      unsubDone()
    }
  }, []) // No deps — subscribe once, use getState() for latest state
}
