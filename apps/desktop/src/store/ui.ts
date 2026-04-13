import { create } from 'zustand'

export type OutputMode = 'aligned' | 'console'

interface UIState {
  settingsOpen: boolean
  packagesOpen: boolean
  sidebarCollapsed: boolean
  outputMode: OutputMode
  /** True once the user has held the platform modifier key for the hint delay.
   * The ShortcutHintOverlay subscribes to this to fade itself in. */
  modifierHeld: boolean
  /** Timestamp of the last explicit save request (Cmd/Ctrl+S). Bumped to
   * trigger the Saved badge — zero means "never" so it doesn't flash on mount. */
  savedAt: number
  openSettings: () => void
  closeSettings: () => void
  toggleSettings: () => void
  openPackages: () => void
  closePackages: () => void
  togglePackages: () => void
  toggleSidebar: () => void
  setSidebarCollapsed: (collapsed: boolean) => void
  toggleOutputMode: () => void
  setOutputMode: (mode: OutputMode) => void
  setModifierHeld: (held: boolean) => void
  markSaved: () => void
}

export const useUIStore = create<UIState>((set) => ({
  settingsOpen: false,
  packagesOpen: false,
  sidebarCollapsed: false,
  outputMode: 'aligned',
  modifierHeld: false,
  savedAt: 0,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),
  toggleSettings: () => set((s) => ({ settingsOpen: !s.settingsOpen })),
  openPackages: () => set({ packagesOpen: true }),
  closePackages: () => set({ packagesOpen: false }),
  togglePackages: () => set((s) => ({ packagesOpen: !s.packagesOpen })),
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  toggleOutputMode: () => set((s) => ({ outputMode: s.outputMode === 'aligned' ? 'console' : 'aligned' })),
  setOutputMode: (mode) => set({ outputMode: mode }),
  setModifierHeld: (held) => set({ modifierHeld: held }),
  markSaved: () => set({ savedAt: Date.now() })
}))
