// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { renderHook, act } from '@testing-library/react'

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
  window.dispatchEvent(new KeyboardEvent(type, { key, ...extra }))
}

/** Load hook + store fresh so each test gets isolated modifierHeld state. */
async function loadAll() {
  const { useModifierHeldListener } = await import('../useModifierHeld')
  const { useUIStore } = await import('../../store/ui')
  return { useModifierHeldListener, useUIStore }
}

describe('useModifierHeldListener (macOS — watches Meta)', () => {
  it('modifierHeld starts false', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))
    expect(useUIStore.getState().modifierHeld).toBe(false)
  })

  it('flips true after holding Meta for the delay', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    expect(useUIStore.getState().modifierHeld).toBe(false)

    act(() => { vi.advanceTimersByTime(999) })
    expect(useUIStore.getState().modifierHeld).toBe(false)

    act(() => { vi.advanceTimersByTime(1) })
    expect(useUIStore.getState().modifierHeld).toBe(true)
  })

  it('stays false if Meta is released before the delay', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { fireKey('keyup', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(useUIStore.getState().modifierHeld).toBe(false)
  })

  it('cancels when a chord is pressed (user already knows)', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { fireKey('keydown', 'n', { metaKey: true }) })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(useUIStore.getState().modifierHeld).toBe(false)
  })

  it('flips false when Meta is released after hint was shown', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(useUIStore.getState().modifierHeld).toBe(true)

    act(() => { fireKey('keyup', 'Meta') })
    expect(useUIStore.getState().modifierHeld).toBe(false)
  })

  it('flips false when a chord is pressed after hint was shown', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    act(() => { fireKey('keydown', 'n', { metaKey: true }) })

    expect(useUIStore.getState().modifierHeld).toBe(false)
  })

  it('ignores repeated Meta keydowns while already scheduled', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(500) })

    // Fires at original 1000ms — repeat keydowns don't reset the timer
    expect(useUIStore.getState().modifierHeld).toBe(true)
  })

  it('flips false on window blur', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(useUIStore.getState().modifierHeld).toBe(true)

    act(() => { window.dispatchEvent(new Event('blur')) })
    expect(useUIStore.getState().modifierHeld).toBe(false)
  })

  it('cleans up listeners on unmount', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    const { unmount } = renderHook(() => useModifierHeldListener(1000))

    unmount()

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(useUIStore.getState().modifierHeld).toBe(false)
  })
})

describe('useModifierHeldListener (Windows/Linux — watches Control)', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      configurable: true,
      writable: true,
    })
  })

  it('responds to Control, not Meta', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Meta') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(useUIStore.getState().modifierHeld).toBe(false)

    act(() => { fireKey('keydown', 'Control') })
    act(() => { vi.advanceTimersByTime(1000) })
    expect(useUIStore.getState().modifierHeld).toBe(true)
  })

  it('cancels on ctrl-chord', async () => {
    const { useModifierHeldListener, useUIStore } = await loadAll()
    renderHook(() => useModifierHeldListener(1000))

    act(() => { fireKey('keydown', 'Control') })
    act(() => { vi.advanceTimersByTime(500) })
    act(() => { fireKey('keydown', 'n', { ctrlKey: true }) })
    act(() => { vi.advanceTimersByTime(1000) })

    expect(useUIStore.getState().modifierHeld).toBe(false)
  })
})
