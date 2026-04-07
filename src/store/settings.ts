import { create } from 'zustand'
import type { AppSettings, ThemeMode } from '../../shared/types'
import { DEFAULT_SETTINGS } from '../../shared/types'

interface SettingsState extends AppSettings {
  // Actions
  setSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void
  setTheme: (theme: ThemeMode) => void
  restoreSettings: (settings: AppSettings) => void
  resetToDefaults: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  ...DEFAULT_SETTINGS,

  setSetting: (key, value) => set({ [key]: value }),

  setTheme: (theme) => set({ theme }),

  restoreSettings: (settings) => set({ ...settings }),

  resetToDefaults: () => set({ ...DEFAULT_SETTINGS })
}))
