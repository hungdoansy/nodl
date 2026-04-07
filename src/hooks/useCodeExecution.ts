import { useEffect, useCallback } from 'react'
import { useOutputStore } from '../store/output'
import { useTabsStore } from '../store/tabs'
import * as bridge from '../ipc/bridge'

export function useCodeExecution() {
  const { addEntry, setDone, setRunning, clear, isRunning, entries, lastResult, setActiveTabId } = useOutputStore()
  const activeTab = useTabsStore((s) => s.activeTab)
  const activeTabId = useTabsStore((s) => s.activeTabId)

  // Sync active tab ID to output store
  useEffect(() => {
    setActiveTabId(activeTabId)
  }, [activeTabId, setActiveTabId])

  useEffect(() => {
    const unsubOutput = bridge.onOutputEntry(addEntry)
    const unsubDone = bridge.onExecutionDone(setDone)
    return () => {
      unsubOutput()
      unsubDone()
    }
  }, [addEntry, setDone])

  const run = useCallback(() => {
    const tab = activeTab()
    setRunning()
    bridge.runCode({ code: tab.code, language: tab.language })
  }, [activeTab, setRunning])

  const stop = useCallback(() => {
    bridge.stopExecution()
  }, [])

  return { run, stop, clear, isRunning, entries: entries(), lastResult: lastResult() }
}
