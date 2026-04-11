import { create } from 'zustand'
import type { InstalledPackage } from '../../shared/types'
import * as bridge from '../ipc/bridge'

interface PackagesState {
  packages: InstalledPackage[]
  installing: string | null
  removing: string | null
  updating: string | null
  latestVersions: Record<string, string>
  error: string | null

  loadPackages: () => Promise<void>
  install: (name: string) => Promise<boolean>
  remove: (name: string) => Promise<boolean>
  update: (name: string, latestVersion: string) => Promise<boolean>
  checkUpdates: () => Promise<void>
  clearError: () => void
}

export const usePackagesStore = create<PackagesState>((set, get) => ({
  packages: [],
  installing: null,
  removing: null,
  updating: null,
  latestVersions: {},
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

  update: async (name, latestVersion) => {
    set({ updating: name, error: null })
    const result = await bridge.installPackage(`${name}@${latestVersion}`)
    if (result.success) {
      await get().loadPackages()
      // Clear the update badge for this package
      set((state) => {
        const { [name]: _, ...rest } = state.latestVersions
        return { updating: null, latestVersions: rest }
      })
      return true
    } else {
      set({ updating: null, error: result.error ?? 'Update failed' })
      return false
    }
  },

  checkUpdates: async () => {
    const { packages } = get()
    if (packages.length === 0) return
    const updates = await bridge.checkPackageUpdates(packages)
    set({ latestVersions: updates })
  },

  clearError: () => set({ error: null })
}))
