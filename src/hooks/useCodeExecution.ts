import { useCallback } from 'react'
import { useOutputStore } from '../store/output'
import { useTabsStore } from '../store/tabs'
import * as bridge from '../ipc/bridge'
import type { OutputEntry, ExecutionResult } from '../../shared/types'

const EMPTY_ENTRIES: OutputEntry[] = []
const NO_RESULT: ExecutionResult | null = null

export function useCodeExecution() {
  const isRunning = useOutputStore((s) => s.isRunning)

  const activeTabId = useTabsStore((s) => s.activeTabId)

  // Use stable fallback references to avoid infinite re-renders
  const entries = useOutputStore((s) => s.outputs[s.activeTabId]?.entries ?? EMPTY_ENTRIES)
  const lastResult = useOutputStore((s) => s.outputs[s.activeTabId]?.lastResult ?? NO_RESULT)

  const run = useCallback(() => {
    const tab = useTabsStore.getState().activeTab()
    // Ensure output store knows the active tab before clearing
    useOutputStore.getState().setActiveTabId(useTabsStore.getState().activeTabId)
    useOutputStore.getState().setRunning()
    bridge.runCode({ code: tab.code, language: tab.language })
  }, [])

  const stop = useCallback(() => {
    bridge.stopExecution()
  }, [])

  const clear = useCallback(() => {
    useOutputStore.getState().clear()
  }, [])

  return { run, stop, clear, isRunning, entries, lastResult }
}
