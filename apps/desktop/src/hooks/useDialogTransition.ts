import { useState, useEffect, useCallback } from 'react'

/**
 * Manages dialog mount/unmount with enter/exit transitions.
 * Returns `mounted` (keep in DOM) and `visible` (apply enter styles).
 * On close, `visible` goes false first, then `mounted` after the transition duration.
 */
export function useDialogTransition(open: boolean, duration = 150) {
  const [mounted, setMounted] = useState(false)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (open) {
      setMounted(true)
      // RAF to ensure mount happens before transition starts
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true))
      })
    } else {
      setVisible(false)
      const timer = setTimeout(() => setMounted(false), duration)
      return () => clearTimeout(timer)
    }
  }, [open, duration])

  const close = useCallback((onClose: () => void) => {
    setVisible(false)
    setTimeout(onClose, duration)
  }, [duration])

  return { mounted, visible, close }
}
