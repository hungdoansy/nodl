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
  /** Whether the next entry should clear previous output first */
  pendingClear: boolean

  setActiveTabId: (id: string) => void
  addEntry: (entry: OutputEntry) => void
  setDone: (result: ExecutionResult) => void
  setRunning: () => void
  clear: () => void
  clearTab: (tabId: string) => void

  // Derived
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
  pendingClear: false,

  setActiveTabId: (id) => set({ activeTabId: id }),

  addEntry: (entry) =>
    set((state) => {
      const tabId = state.activeTabId
      const current = state.outputs[tabId] ?? emptyOutput()

      if (entry.method === 'clear') {
        return {
          pendingClear: false,
          outputs: { ...state.outputs, [tabId]: { ...current, entries: [] } }
        }
      }

      // If a new run started, clear old output on first new entry
      const base = state.pendingClear ? [] : current.entries

      return {
        pendingClear: false,
        outputs: {
          ...state.outputs,
          [tabId]: { ...current, entries: [...base, entry] }
        }
      }
    }),

  setDone: (result) =>
    set((state) => {
      const tabId = state.activeTabId
      const current = state.outputs[tabId] ?? emptyOutput()
      // If pendingClear is still true, nothing was output — clear now
      const entries = state.pendingClear ? [] : current.entries
      return {
        isRunning: false,
        pendingClear: false,
        outputs: { ...state.outputs, [tabId]: { entries, lastResult: result } }
      }
    }),

  setRunning: () =>
    set(() => {
      // Don't clear output yet — set pendingClear flag so it clears
      // when the first new entry arrives. This prevents flash.
      return {
        isRunning: true,
        pendingClear: true
      }
    }),

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
