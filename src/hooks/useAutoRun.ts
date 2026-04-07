import { useEffect, useRef } from 'react'
import { useEditorStore } from '../store/editor'

export function useAutoRun(run: () => void, enabled: boolean, delay = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const code = useEditorStore((s) => s.code)

  useEffect(() => {
    if (!enabled) return

    if (timerRef.current) {
      clearTimeout(timerRef.current)
    }

    timerRef.current = setTimeout(() => {
      run()
      timerRef.current = null
    }, delay)

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }, [code, enabled, delay, run])

  return {
    cancel() {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
    }
  }
}
