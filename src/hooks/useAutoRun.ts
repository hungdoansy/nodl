import { useEffect, useRef } from 'react'
import { useTabsStore } from '../store/tabs'

export function useAutoRun(run: () => void, enabled: boolean, delay = 300) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeTab = useTabsStore((s) => s.activeTab)
  const code = activeTab().code

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
