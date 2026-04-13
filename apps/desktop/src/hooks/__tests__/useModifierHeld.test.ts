// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

// Force the mac path regardless of test env — we verify the other branch
// separately by re-importing with a non-Mac platform.
beforeEach(() => {
  vi.resetModules()
  Object.defineProperty(global, 'navigator', {
    value: { platform: 'MacIntel' },
    configurable: true,
    writable: true,
  })
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetModules()
})

function fireKey(type: 'keydown' | 'keyup', key: string, extra: Partial<KeyboardEventInit> = {}) {
  const event = new KeyboardEvent(type, { key, ...extra })
  window.dispatchEvent(event)
}

async function loadHook() {
  const { useModifierHeld } = await import('../useModifierHeld')
  return useModifierHeld
}

describe('useModifierHeld (macOS — watches Meta)', () => {
  it('starts false', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))
    expect(result.current).toBe(false)
  })

  it('becomes true after holding Meta for the delay', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    act(() => { fireKey('keydown', 'Meta') })
    expect(result.current).toBe(false)

    act(() => { vi.advanceTimersByTime(999) })
    expect(result.current).toBe(false)

    act(() => { vi.advanceTimersByTime(1) })
    expect(result.current).toBe(true)
  })

  it('stays false if Meta is released before the delay', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { fireKey('keyup', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current).toBe(false)
  })

  it('cancels when another key is pressed with the modifier (chord is being used)', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })
    // User presses ⌘N — pending timer should be cancelled
    act(() => { fireKey('keydown', 'n', { metaKey: true }) })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current).toBe(false)
  })

  it('hides when Meta is released after the hint was shown', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe(true)

    act(() => { fireKey('keyup', 'Meta') })
    expect(result.current).toBe(false)
  })

  it('hides when a chord is pressed after the hint was shown', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe(true)

    act(() => { fireKey('keydown', 'n', { metaKey: true }) })
    expect(result.current).toBe(false)
  })

  it('ignores repeated Meta keydowns while already scheduled', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    // Some OSes fire multiple keydown events while a key is held
    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })

    // Should have fired once at ~1000ms, not reset the timer
    expect(result.current).toBe(true)
  })

  it('hides on window blur', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe(true)

    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(result.current).toBe(false)
  })

  it('cleans up listeners on unmount', async () => {
    const useModifierHeld = await loadHook()
    const { result, unmount } = renderHook(() => useModifierHeld(1000))

    unmount()

    // After unmount, firing events shouldn't change anything
    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe(false)
  })
})

describe('useModifierHeld (Windows/Linux — watches Control)', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      configurable: true,
      writable: true,
    })
  })

  it('responds to Control, not Meta', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    // Meta should be ignored on Windows
    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe(false)

    // Control should work
    act(() => { fireKey('keydown', 'Control') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(result.current).toBe(true)
  })

  it('cancels on ctrl-chord', async () => {
    const useModifierHeld = await loadHook()
    const { result } = renderHook(() => useModifierHeld(1000))

    act(() => { fireKey('keydown', 'Control') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { fireKey('keydown', 'n', { ctrlKey: true }) })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(result.current).toBe(false)
  })
})
