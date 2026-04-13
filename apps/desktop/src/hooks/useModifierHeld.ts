import { useEffect, useState } from 'react'
import { IS_MAC } from '../utils/shortcut'

/**
 * Returns true once the user has held the platform modifier key (Cmd on macOS,
 * Ctrl elsewhere) for `delayMs` without pressing any other key in that window.
 *
 * Goes back to false the instant:
 *  - the modifier is released
 *  - any other key is pressed while waiting (user is actually using a chord)
 *  - the window loses focus
 *
 * The delay is intentional: experienced users who already know the shortcut
 * shouldn't see a hint flash at them every time they press a chord.
 */
const MODIFIER_KEY = IS_MAC ? 'Meta' : 'Control'

export function useModifierHeld(delayMs: number): boolean {
  const [held, setHeld] = useState(false)

  useEffect(() => {
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
        // Repeat events fire while held — only start the timer once
        if (timer || shown) return
        timer = setTimeout(() => {
          timer = null
          shown = true
          setHeld(true)
        }, delayMs)
      } else if (e.metaKey || e.ctrlKey) {
        // A chord is being pressed — user already knows what they want,
        // don't flash the hint at them
        hide()
      }
    }

    const onKeyUp = (e: KeyboardEvent) => {
      if (e.key === MODIFIER_KEY) hide()
    }

    // Window blur / tab switch while holding the key: we never see keyup,
    // so hide proactively
    const onBlur = () => hide()
    const onVisibilityChange = () => { if (document.hidden) hide() }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onBlur)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      clearTimer()
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onBlur)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [delayMs])

  return held
}
