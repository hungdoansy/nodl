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
      activeTabId: 'tab-1'
    })
  })

  it('starts with empty state', () => {
    const state = useOutputStore.getState()
    expect(state.entries()).toEqual([])
    expect(state.isRunning).toBe(false)
    expect(state.lastResult()).toBeNull()
  })

  it('addEntry appends to active tab entries', () => {
    const entry = makeEntry()
    useOutputStore.getState().addEntry(entry)
    expect(useOutputStore.getState().entries()).toHaveLength(1)
  })

  it('entries are isolated per tab', () => {
    useOutputStore.getState().addEntry(makeEntry({ args: ['tab1 entry'] }))
    useOutputStore.getState().setActiveTabId('tab-2')
    expect(useOutputStore.getState().entries()).toHaveLength(0)

    useOutputStore.getState().addEntry(makeEntry({ args: ['tab2 entry'] }))
    expect(useOutputStore.getState().entries()).toHaveLength(1)

    // Switch back — tab-1 still has its entry
    useOutputStore.getState().setActiveTabId('tab-1')
    expect(useOutputStore.getState().entries()).toHaveLength(1)
    expect(useOutputStore.getState().entries()[0].args).toEqual(['tab1 entry'])
  })

  it('addEntry with clear method resets entries for active tab', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().addEntry(makeEntry({ method: 'clear' }))
    expect(useOutputStore.getState().entries()).toHaveLength(0)
  })

  it('setRunning clears active tab entries and sets isRunning', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().setRunning()
    expect(useOutputStore.getState().isRunning).toBe(true)
    expect(useOutputStore.getState().entries()).toHaveLength(0)
  })

  it('setDone stores result for active tab and clears isRunning', () => {
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
