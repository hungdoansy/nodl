import { create } from 'zustand'
import type { OutputEntry, ExecutionResult } from '../../shared/types'

interface TabOutput {
  entries: OutputEntry[]
  lastResult: ExecutionResult | null
}

interface OutputState {
  outputs: Record<string, TabOutput>
  isRunning: boolean
  activeTabId: string
  /** Buffered entries from current run — flushed on done */
  buffer: OutputEntry[]

  setActiveTabId: (id: string) => void
  addEntry: (entry: OutputEntry) => void
  setDone: (result: ExecutionResult) => void
  setRunning: () => void
  clear: () => void
  clearTab: (tabId: string) => void

  entries: () => OutputEntry[]
  lastResult: () => ExecutionResult | null
}

function emptyOutput(): TabOutput {
  return { entries: [], lastResult: null }
}

export const useOutputStore = create<OutputState>((set, get) => ({
  outputs: {},
  isRunning: false,
  activeTabId: '',
  buffer: [],

  setActiveTabId: (id) => set({ activeTabId: id }),

  addEntry: (entry) =>
    set((state) => {
      if (entry.method === 'clear') {
        return { buffer: [] }
      }
      // Buffer entries during execution — they get flushed on setDone
      return { buffer: [...state.buffer, entry] }
    }),

  setDone: (result) =>
    set((state) => {
      const tabId = state.activeTabId
      // Flush buffer → replace old output atomically (no flash)
      return {
        isRunning: false,
        buffer: [],
        outputs: {
          ...state.outputs,
          [tabId]: { entries: state.buffer, lastResult: result }
        }
      }
    }),

  setRunning: () =>
    set(() => ({
      isRunning: true,
      buffer: []
    })),

  clear: () =>
    set((state) => {
      const tabId = state.activeTabId
      return {
        outputs: { ...state.outputs, [tabId]: emptyOutput() }
      }
    }),

  clearTab: (tabId) =>
    set((state) => {
      const { [tabId]: _, ...rest } = state.outputs
      return { outputs: rest }
    }),

  entries: () => {
    const state = get()
    return state.outputs[state.activeTabId]?.entries ?? []
  },

  lastResult: () => {
    const state = get()
    return state.outputs[state.activeTabId]?.lastResult ?? null
  }
}))
