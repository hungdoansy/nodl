import { create } from 'zustand'
import type { InstalledPackage } from '../../shared/types'
import * as bridge from '../ipc/bridge'

interface PackagesState {
  packages: InstalledPackage[]
  installing: string | null
  removing: string | null
  error: string | null

  loadPackages: () => Promise<void>
  install: (name: string) => Promise<boolean>
  remove: (name: string) => Promise<boolean>
  clearError: () => void
}

export const usePackagesStore = create<PackagesState>((set, get) => ({
  packages: [],
  installing: null,
  removing: null,
  error: null,

  loadPackages: async () => {
    const packages = await bridge.listPackages()
    set({ packages })
  },

  install: async (name) => {
    set({ installing: name, error: null })
    const result = await bridge.installPackage(name)
    if (result.success) {
      await get().loadPackages()
      set({ installing: null })
      return true
    } else {
      set({ installing: null, error: result.error ?? 'Install failed' })
      return false
    }
  },

  remove: async (name) => {
    set({ removing: name, error: null })
    const result = await bridge.removePackage(name)
    if (result.success) {
      await get().loadPackages()
      set({ removing: null })
      return true
    } else {
      set({ removing: null, error: result.error ?? 'Remove failed' })
      return false
    }
  },

  clearError: () => set({ error: null })
}))
