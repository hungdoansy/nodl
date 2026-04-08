import { describe, it, expect, beforeEach } from 'vitest'
import { useOutputStore } from '../output'
import type { OutputEntry, ExecutionResult } from '../../../shared/types'

function makeEntry(overrides: Partial<OutputEntry> = {}): OutputEntry {
  return {
    id: `test-${Date.now()}-${Math.random()}`,
    method: 'log',
    args: ['test'],
    timestamp: Date.now(),
    ...overrides
  }
}

describe('useOutputStore (per-tab)', () => {
  beforeEach(() => {
    useOutputStore.setState({
      outputs: {},
      isRunning: false,
      activeTabId: 'tab-1',
      buffer: []
    })
  })

  it('starts with empty state', () => {
    const state = useOutputStore.getState()
    expect(state.entries()).toEqual([])
    expect(state.isRunning).toBe(false)
    expect(state.lastResult()).toBeNull()
  })

  it('addEntry buffers entries during execution', () => {
    useOutputStore.getState().addEntry(makeEntry())
    // Buffered — not yet in visible entries
    expect(useOutputStore.getState().buffer).toHaveLength(1)
  })

  it('setDone flushes buffer to visible entries atomically', () => {
    useOutputStore.getState().setRunning()
    useOutputStore.getState().addEntry(makeEntry({ args: ['a'] }))
    useOutputStore.getState().addEntry(makeEntry({ args: ['b'] }))
    // Still buffered, old entries visible
    expect(useOutputStore.getState().entries()).toHaveLength(0)

    useOutputStore.getState().setDone({ success: true, duration: 10 })
    // Flushed — both entries now visible
    expect(useOutputStore.getState().entries()).toHaveLength(2)
    expect(useOutputStore.getState().entries()[0].args).toEqual(['a'])
    expect(useOutputStore.getState().entries()[1].args).toEqual(['b'])
  })

  it('setRunning keeps old output visible (no flash)', () => {
    // Simulate a previous run
    useOutputStore.getState().addEntry(makeEntry({ args: ['old'] }))
    useOutputStore.getState().setDone({ success: true, duration: 5 })
    expect(useOutputStore.getState().entries()).toHaveLength(1)

    // Start new run — old output stays
    useOutputStore.getState().setRunning()
    expect(useOutputStore.getState().isRunning).toBe(true)
    expect(useOutputStore.getState().entries()).toHaveLength(1)
    expect(useOutputStore.getState().entries()[0].args).toEqual(['old'])

    // New output arrives + done — old replaced atomically
    useOutputStore.getState().addEntry(makeEntry({ args: ['new'] }))
    useOutputStore.getState().setDone({ success: true, duration: 8 })
    expect(useOutputStore.getState().entries()).toHaveLength(1)
    expect(useOutputStore.getState().entries()[0].args).toEqual(['new'])
  })

  it('entries are isolated per tab', () => {
    useOutputStore.getState().addEntry(makeEntry({ args: ['tab1'] }))
    useOutputStore.getState().setDone({ success: true, duration: 1 })
    useOutputStore.getState().setActiveTabId('tab-2')
    expect(useOutputStore.getState().entries()).toHaveLength(0)

    useOutputStore.getState().addEntry(makeEntry({ args: ['tab2'] }))
    useOutputStore.getState().setDone({ success: true, duration: 1 })
    expect(useOutputStore.getState().entries()).toHaveLength(1)

    useOutputStore.getState().setActiveTabId('tab-1')
    expect(useOutputStore.getState().entries()).toHaveLength(1)
    expect(useOutputStore.getState().entries()[0].args).toEqual(['tab1'])
  })

  it('addEntry with clear method resets buffer', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().addEntry(makeEntry({ method: 'clear' }))
    expect(useOutputStore.getState().buffer).toHaveLength(0)
  })

  it('setDone stores result and clears isRunning', () => {
    useOutputStore.getState().setRunning()
    const result: ExecutionResult = { success: true, duration: 42 }
    useOutputStore.getState().setDone(result)
    expect(useOutputStore.getState().isRunning).toBe(false)
    expect(useOutputStore.getState().lastResult()).toBe(result)
  })

  it('clear resets active tab entries and lastResult', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().setDone({ success: true, duration: 10 })
    useOutputStore.getState().clear()
    expect(useOutputStore.getState().entries()).toHaveLength(0)
    expect(useOutputStore.getState().lastResult()).toBeNull()
  })

  it('clearTab removes output for a specific tab', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().setDone({ success: true, duration: 1 })
    useOutputStore.getState().clearTab('tab-1')
    expect(useOutputStore.getState().entries()).toHaveLength(0)
  })

  it('lastResult is per-tab', () => {
    const result: ExecutionResult = { success: true, duration: 10 }
    useOutputStore.getState().setDone(result)
    expect(useOutputStore.getState().lastResult()).toBe(result)

    useOutputStore.getState().setActiveTabId('tab-2')
    expect(useOutputStore.getState().lastResult()).toBeNull()
  })
})
