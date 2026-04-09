import { create } from 'zustand'

export type OutputMode = 'aligned' | 'console'

interface UIState {
  settingsOpen: boolean
  sidebarCollapsed: boolean
  outputMode: OutputMode
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleOutputMode: () => void
  setOutputMode: (mode: OutputMode) => void
}

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  sidebarCollapsed: false,
  outputMode: 'aligned',
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleOutputMode: () => set((s) => ({ outputMode: s.outputMode === 'aligned' ? 'console' : 'aligned' })),
  setOutputMode: (mode) => set({ outputMode: mode })
}))
