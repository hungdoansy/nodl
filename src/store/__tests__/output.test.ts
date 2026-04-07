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

describe('useOutputStore', () => {
  beforeEach(() => {
    useOutputStore.setState({
      entries: [],
      isRunning: false,
      lastResult: null
    })
  })

  it('starts with empty state', () => {
    const state = useOutputStore.getState()
    expect(state.entries).toEqual([])
    expect(state.isRunning).toBe(false)
    expect(state.lastResult).toBeNull()
  })

  it('addEntry appends to entries', () => {
    const entry = makeEntry()
    useOutputStore.getState().addEntry(entry)
    expect(useOutputStore.getState().entries).toHaveLength(1)
    expect(useOutputStore.getState().entries[0]).toBe(entry)
  })

  it('addEntry with clear method resets entries', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().addEntry(makeEntry({ method: 'clear' }))
    expect(useOutputStore.getState().entries).toHaveLength(0)
  })

  it('setRunning clears entries and sets isRunning', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().setRunning()
    const state = useOutputStore.getState()
    expect(state.isRunning).toBe(true)
    expect(state.entries).toHaveLength(0)
    expect(state.lastResult).toBeNull()
  })

  it('setDone stores result and clears isRunning', () => {
    useOutputStore.getState().setRunning()
    const result: ExecutionResult = { success: true, duration: 42 }
    useOutputStore.getState().setDone(result)
    const state = useOutputStore.getState()
    expect(state.isRunning).toBe(false)
    expect(state.lastResult).toBe(result)
  })

  it('clear resets entries and lastResult', () => {
    useOutputStore.getState().addEntry(makeEntry())
    useOutputStore.getState().setDone({ success: true, duration: 10 })
    useOutputStore.getState().clear()
    const state = useOutputStore.getState()
    expect(state.entries).toHaveLength(0)
    expect(state.lastResult).toBeNull()
  })
})
