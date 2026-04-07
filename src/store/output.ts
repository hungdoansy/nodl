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

  setActiveTabId: (id) => set({ activeTabId: id }),

  addEntry: (entry) =>
    set((state) => {
      const tabId = state.activeTabId
      const current = state.outputs[tabId] ?? emptyOutput()
      if (entry.method === 'clear') {
        return {
          outputs: { ...state.outputs, [tabId]: { ...current, entries: [] } }
        }
      }
      return {
        outputs: {
          ...state.outputs,
          [tabId]: { ...current, entries: [...current.entries, entry] }
        }
      }
    }),

  setDone: (result) =>
    set((state) => {
      const tabId = state.activeTabId
      const current = state.outputs[tabId] ?? emptyOutput()
      return {
        isRunning: false,
        outputs: { ...state.outputs, [tabId]: { ...current, lastResult: result } }
      }
    }),

  setRunning: () =>
    set((state) => {
      const tabId = state.activeTabId
      return {
        isRunning: true,
        outputs: { ...state.outputs, [tabId]: emptyOutput() }
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
