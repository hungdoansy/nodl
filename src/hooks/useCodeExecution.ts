import { useCallback } from 'react'
import { useOutputStore } from '../store/output'
import { useTabsStore } from '../store/tabs'
import * as bridge from '../ipc/bridge'
import type { OutputEntry, ExecutionResult } from '../../shared/types'

const EMPTY_ENTRIES: OutputEntry[] = []
const NO_RESULT: ExecutionResult | null = null

export function useCodeExecution() {
  const setRunning = useOutputStore((s) => s.setRunning)
  const clear = useOutputStore((s) => s.clear)
  const isRunning = useOutputStore((s) => s.isRunning)

  const activeTab = useTabsStore((s) => s.activeTab)

  // Use stable fallback references to avoid infinite re-renders
  const entries = useOutputStore((s) => s.outputs[s.activeTabId]?.entries ?? EMPTY_ENTRIES)
  const lastResult = useOutputStore((s) => s.outputs[s.activeTabId]?.lastResult ?? NO_RESULT)

  const run = useCallback(() => {
    const tab = activeTab()
    setRunning()
    bridge.runCode({ code: tab.code, language: tab.language })
  }, [activeTab, setRunning])

  const stop = useCallback(() => {
    bridge.stopExecution()
  }, [])

  return { run, stop, clear, isRunning, entries, lastResult }
}
