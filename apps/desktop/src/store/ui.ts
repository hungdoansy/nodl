import { create } from 'zustand'

export type OutputMode = 'aligned' | 'console'

interface UIState {
  settingsOpen: boolean
  sidebarCollapsed: boolean
  outputMode: OutputMode
  /** Timestamp of the last explicit save request (Cmd/Ctrl+S). Bumped to
   * trigger the SaveToast — zero means "never" so the toast doesn't flash
   * on mount. */
  savedAt: number
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleOutputMode: () => void
  setOutputMode: (mode: OutputMode) => void
  markSaved: () => void
}

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  sidebarCollapsed: false,
  outputMode: 'aligned',
  savedAt: 0,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleOutputMode: () => set((s) => ({ outputMode: s.outputMode === 'aligned' ? 'console' : 'aligned' })),
  setOutputMode: (mode) => set({ outputMode: mode }),
  markSaved: () => set({ savedAt: Date.now() })
}))
