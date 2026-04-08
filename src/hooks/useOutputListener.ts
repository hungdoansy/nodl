import { useEffect } from 'react'
import { useOutputStore } from '../store/output'
import { useTabsStore } from '../store/tabs'
import * as bridge from '../ipc/bridge'

/**
 * Subscribes to IPC output events exactly once at the App level.
 * Must be called from a single component (App.tsx) to avoid duplicate listeners.
 */
export function useOutputListener() {
  const addEntry = useOutputStore((s) => s.addEntry)
  const setDone = useOutputStore((s) => s.setDone)
  const setActiveTabId = useOutputStore((s) => s.setActiveTabId)
  const activeTabId = useTabsStore((s) => s.activeTabId)

  // Sync active tab ID to output store
  useEffect(() => {
    setActiveTabId(activeTabId)
  }, [activeTabId, setActiveTabId])

  // Subscribe to IPC events — only once
  useEffect(() => {
    const unsubOutput = bridge.onOutputEntry(addEntry)
    const unsubDone = bridge.onExecutionDone(setDone)
    return () => {
      unsubOutput()
      unsubDone()
    }
  }, [addEntry, setDone])
}
