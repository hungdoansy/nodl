import { create } from 'zustand'

interface ScrollSyncState {
  scrollTop: number
  source: 'editor' | 'output' | null
  setScrollTop: (top: number, source: 'editor' | 'output') => void
}

export const useScrollSync = create<ScrollSyncState>((set) => ({
  scrollTop: 0,
  source: null,
  setScrollTop: (top, source) => set({ scrollTop: top, source }),
}))
