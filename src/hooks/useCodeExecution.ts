import { useEffect, useCallback } from 'react'
import { useOutputStore } from '../store/output'
import { useEditorStore } from '../store/editor'
import * as bridge from '../ipc/bridge'

export function useCodeExecution() {
  const { addEntry, setDone, setRunning, clear, isRunning, entries, lastResult } = useOutputStore()
  const { code, language } = useEditorStore()

  useEffect(() => {
    const unsubOutput = bridge.onOutputEntry(addEntry)
    const unsubDone = bridge.onExecutionDone(setDone)
    return () => {
      unsubOutput()
      unsubDone()
    }
  }, [addEntry, setDone])

  const run = useCallback(() => {
    setRunning()
    bridge.runCode({ code, language })
  }, [code, language, setRunning])

  const stop = useCallback(() => {
    bridge.stopExecution()
  }, [])

  return { run, stop, clear, isRunning, entries, lastResult }
}
