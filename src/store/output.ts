import { create } from 'zustand'
import type { OutputEntry, ExecutionResult } from '../../shared/types'

interface OutputState {
  entries: OutputEntry[]
  isRunning: boolean
  lastResult: ExecutionResult | null
  addEntry: (entry: OutputEntry) => void
  setDone: (result: ExecutionResult) => void
  setRunning: () => void
  clear: () => void
}

export const useOutputStore = create<OutputState>((set) => ({
  entries: [],
  isRunning: false,
  lastResult: null,

  addEntry: (entry) =>
    set((state) => {
      if (entry.method === 'clear') {
        return { entries: [] }
      }
      return { entries: [...state.entries, entry] }
    }),

  setDone: (result) =>
    set({ isRunning: false, lastResult: result }),

  setRunning: () =>
    set({ isRunning: true, entries: [], lastResult: null }),

  clear: () =>
    set({ entries: [], lastResult: null })
}))
