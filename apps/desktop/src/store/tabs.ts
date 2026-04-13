import { create } from 'zustand'
import { nanoid } from 'nanoid'

export interface Tab {
  id: string
  name: string
  language: 'javascript' | 'typescript'
  code: string
  createdAt: number
  updatedAt: number
}

export const WELCOME_CODE = `// Welcome to nodl — a fast JS/TS scratchpad
// Hit Cmd+Enter (or Ctrl+Enter) to run your code

console.log("Hello, nodl!")

// Expressions are evaluated inline — no console.log needed
2 ** 10

// TypeScript works out of the box
const greet = (name: string): string => \`Hello, \${name}!\`
greet("world")

// Arrays, objects, promises — all rendered nicely
const squares = [1, 2, 3].map(x => x * x)
squares

// Install npm packages from the sidebar
// import lodash from "lodash"
`

export function createDefaultTab(index = 1, welcome = false): Tab {
  return {
    id: nanoid(),
    name: `Untitled ${index}`,
    language: 'typescript',
    code: welcome ? WELCOME_CODE : '',
    createdAt: Date.now(),
    updatedAt: Date.now()
  }
}

interface TabsState {
  tabs: Tab[]
  activeTabId: string

  // Derived
  activeTab: () => Tab

  // Actions
  createTab: () => void
  closeTab: (id: string) => void
  renameTab: (id: string, name: string) => void
  setActiveTab: (id: string) => void
  updateCode: (code: string) => void
  setLanguage: (language: 'javascript' | 'typescript') => void
  reorderTabs: (fromIndex: number, toIndex: number) => void

  // For persistence restore
  restoreTabs: (tabs: Tab[], activeTabId: string) => void
}

const initialTab = createDefaultTab(1, true)

export const useTabsStore = create<TabsState>((set, get) => ({
  tabs: [initialTab],
  activeTabId: initialTab.id,

  activeTab: () => {
    const state = get()
    return state.tabs.find((t) => t.id === state.activeTabId) ?? state.tabs[0]
  },

  createTab: () => {
    const newTab = createDefaultTab(get().tabs.length + 1)
    set((state) => ({
      tabs: [...state.tabs, newTab],
      activeTabId: newTab.id
    }))
  },

  closeTab: (id) =>
    set((state) => {
      if (state.tabs.length <= 1) {
        // Can't close last tab — replace with fresh default
        const fresh = createDefaultTab(1)
        return { tabs: [fresh], activeTabId: fresh.id }
      }
      const remaining = state.tabs.filter((t) => t.id !== id)
      const newActive =
        state.activeTabId === id
          ? remaining[Math.min(state.tabs.findIndex((t) => t.id === id), remaining.length - 1)].id
          : state.activeTabId
      return { tabs: remaining, activeTabId: newActive }
    }),

  renameTab: (id, name) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === id ? { ...t, name, updatedAt: Date.now() } : t
      )
    })),

  setActiveTab: (id) => set({ activeTabId: id }),

  updateCode: (code) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, code, updatedAt: Date.now() } : t
      )
    })),

  setLanguage: (language) =>
    set((state) => ({
      tabs: state.tabs.map((t) =>
        t.id === state.activeTabId ? { ...t, language, updatedAt: Date.now() } : t
      )
    })),

  reorderTabs: (fromIndex, toIndex) =>
    set((state) => {
      const tabs = [...state.tabs]
      const [moved] = tabs.splice(fromIndex, 1)
      tabs.splice(toIndex, 0, moved)
      return { tabs }
    }),

  restoreTabs: (tabs, activeTabId) => {
    if (tabs.length === 0) {
      const fresh = createDefaultTab(1)
      set({ tabs: [fresh], activeTabId: fresh.id })
    } else {
      const validActive = tabs.some((t) => t.id === activeTabId) ? activeTabId : tabs[0].id
      set({ tabs, activeTabId: validActive })
    }
  }
}))
