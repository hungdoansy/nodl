import { create } from 'zustand'

interface ScrollSyncState {
  scrollTop: number
  source: 'editor' | 'output' | null
  setScrollTop: (top: number, source: 'editor' | 'output') => void
  /** Per-line visual heights from Monaco (accounts for word wrap). null = use fixed lineHeight. */
  lineHeights: Map<number, number> | null
  setLineHeights: (heights: Map<number, number> | null) => void
}

export const useScrollSync = create<ScrollSyncState>((set) => ({
  scrollTop: 0,
  source: null,
  setScrollTop: (top, source) => set({ scrollTop: top, source }),
  lineHeights: null,
  setLineHeights: (heights) => set({ lineHeights: heights }),
}))
