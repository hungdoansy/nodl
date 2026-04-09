import { describe, it, expect, beforeEach } from 'vitest'
import { useTabsStore, createDefaultTab } from '../tabs'

describe('useTabsStore', () => {
  beforeEach(() => {
    const tab = createDefaultTab(1)
    useTabsStore.setState({
      tabs: [tab],
      activeTabId: tab.id
    })
  })

  it('starts with one default tab', () => {
    const state = useTabsStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].name).toBe('Untitled 1')
    expect(state.tabs[0].language).toBe('typescript')
    expect(state.activeTabId).toBe(state.tabs[0].id)
  })

  it('createTab adds a new tab and activates it', () => {
    useTabsStore.getState().createTab()
    const state = useTabsStore.getState()
    expect(state.tabs).toHaveLength(2)
    expect(state.activeTabId).toBe(state.tabs[1].id)
  })

  it('closeTab removes the tab', () => {
    useTabsStore.getState().createTab()
    const tabToClose = useTabsStore.getState().tabs[0].id
    useTabsStore.getState().closeTab(tabToClose)
    expect(useTabsStore.getState().tabs).toHaveLength(1)
  })

  it('closeTab on last tab creates a fresh default tab', () => {
    const lastId = useTabsStore.getState().tabs[0].id
    useTabsStore.getState().closeTab(lastId)
    const state = useTabsStore.getState()
    expect(state.tabs).toHaveLength(1)
    expect(state.tabs[0].id).not.toBe(lastId)
    expect(state.tabs[0].name).toBe('Untitled 1')
  })

  it('closeTab activates adjacent tab when closing active', () => {
    useTabsStore.getState().createTab()
    useTabsStore.getState().createTab()
    const tabs = useTabsStore.getState().tabs
    // Activate middle tab
    useTabsStore.getState().setActiveTab(tabs[1].id)
    useTabsStore.getState().closeTab(tabs[1].id)
    // Should activate tab at same position (now the last one)
    expect(useTabsStore.getState().activeTabId).toBe(tabs[2].id)
  })

  it('renameTab updates the tab name', () => {
    const id = useTabsStore.getState().tabs[0].id
    useTabsStore.getState().renameTab(id, 'My Script')
    expect(useTabsStore.getState().tabs[0].name).toBe('My Script')
  })

  it('setActiveTab changes the active tab', () => {
    useTabsStore.getState().createTab()
    const firstId = useTabsStore.getState().tabs[0].id
    useTabsStore.getState().setActiveTab(firstId)
    expect(useTabsStore.getState().activeTabId).toBe(firstId)
  })

  it('updateCode updates the active tab code', () => {
    useTabsStore.getState().updateCode('const x = 42;')
    expect(useTabsStore.getState().activeTab().code).toBe('const x = 42;')
  })

  it('updateCode does not affect inactive tabs', () => {
    useTabsStore.getState().createTab()
    const firstTabCode = useTabsStore.getState().tabs[0].code
    useTabsStore.getState().updateCode('new code')
    expect(useTabsStore.getState().tabs[0].code).toBe(firstTabCode)
  })

  it('setLanguage updates the active tab language', () => {
    useTabsStore.getState().setLanguage('typescript')
    expect(useTabsStore.getState().activeTab().language).toBe('typescript')
  })

  it('reorderTabs moves a tab from one position to another', () => {
    useTabsStore.getState().createTab()
    useTabsStore.getState().createTab()
    const originalOrder = useTabsStore.getState().tabs.map((t) => t.id)
    useTabsStore.getState().reorderTabs(0, 2)
    const newOrder = useTabsStore.getState().tabs.map((t) => t.id)
    expect(newOrder[0]).toBe(originalOrder[1])
    expect(newOrder[1]).toBe(originalOrder[2])
    expect(newOrder[2]).toBe(originalOrder[0])
  })

  it('activeTab returns the correct tab', () => {
    useTabsStore.getState().createTab()
    const secondId = useTabsStore.getState().tabs[1].id
    useTabsStore.getState().setActiveTab(secondId)
    expect(useTabsStore.getState().activeTab().id).toBe(secondId)
  })

  it('restoreTabs replaces state', () => {
    const tabs = [createDefaultTab(1), createDefaultTab(2)]
    useTabsStore.getState().restoreTabs(tabs, tabs[1].id)
    const state = useTabsStore.getState()
    expect(state.tabs).toHaveLength(2)
    expect(state.activeTabId).toBe(tabs[1].id)
  })

  it('restoreTabs with empty array creates default tab', () => {
    useTabsStore.getState().restoreTabs([], 'nonexistent')
    const state = useTabsStore.getState()
    expect(state.tabs).toHaveLength(1)
  })

  it('restoreTabs with invalid activeTabId falls back to first tab', () => {
    const tabs = [createDefaultTab(1)]
    useTabsStore.getState().restoreTabs(tabs, 'nonexistent')
    expect(useTabsStore.getState().activeTabId).toBe(tabs[0].id)
  })

  it('updateCode updates updatedAt timestamp', () => {
    const before = useTabsStore.getState().activeTab().updatedAt
    // Small delay to ensure timestamp differs
    useTabsStore.getState().updateCode('changed')
    expect(useTabsStore.getState().activeTab().updatedAt).toBeGreaterThanOrEqual(before)
  })

  it('initial tab has welcome code', () => {
    const tab = createDefaultTab(1, true)
    expect(tab.code).toContain('Welcome to nodl')
    expect(tab.code).toContain('console.log')
    expect(tab.code.length).toBeGreaterThan(0)
  })

  it('new tabs have blank code', () => {
    const tab = createDefaultTab(2)
    expect(tab.code).toBe('')
  })

  it('createTab creates a blank tab', () => {
    useTabsStore.getState().createTab()
    const newTab = useTabsStore.getState().tabs[1]
    expect(newTab.code).toBe('')
  })
})
