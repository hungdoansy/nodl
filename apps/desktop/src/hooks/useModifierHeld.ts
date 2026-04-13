import { useEffect } from 'react'
import { useUIStore } from '../store/ui'
import { IS_MAC } from '../utils/shortcut'

/**
 * Detect when the user holds the platform modifier key (Cmd on macOS,
 * Ctrl elsewhere) for `delayMs` without pressing any other key.
 *
 * The result is broadcast through `ui.modifierHeld` so any button can
 * subscribe without each one adding its own window listeners.
 *
 * Flips back to false the instant:
 *  - the modifier is released
 *  - any other key is pressed while waiting (user is using a chord)
 *  - the window loses focus / becomes hidden
 *
 * The delay is intentional: experienced users who already know the chord
 * shouldn't see a hint flash at them every time.
 */
const MODIFIER_KEY = IS_MAC ? 'Meta' : 'Control'

export const HINT_DELAY_MS = 1000

export function useModifierHeldListener(delayMs: number = HINT_DELAY_MS): void {
  useEffect(() => {
    const setHeld = useUIStore.getState().setModifierHeld
    let timer: ReturnType<typeof setTimeout> | null = null
    let shown = false

    const clearTimer = () => {
      if (timer) { clearTimeout(timer); timer = null }
    }
    const hide = () => {
      clearTimer()
      if (shown) {
        shown = false
        setHeld(false)
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === MODIFIER_KEY) {
        // Keyboard repeat fires many keydowns while held — only schedule once
        if (timer || shown) return
        timer = setTimeout(() => {
          timer = null
          shown = true
          setHeld(true)
        }, delayMs)
      } else if (e.metaKey || e.ctrlKey) {
        // A chord is being pressed — user already knows what they want
        hide()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === MODIFIER_KEY) hide()
    }

    const onBlur = () => hide()
    const onVisibilityChange = () => { if (document.hidden) hide() }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      hide()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [delayMs])
}

/** Subscribe to the global modifier-held state. Safe to use in any button. */
export function useModifierHeld(): boolean {
  return useUIStore((s) => s.modifierHeld)
}
