import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({
      settingsOpen: false,
      sidebarCollapsed: false,
      outputMode: 'aligned',
    })
  })

  // --- Settings dialog ---
  it('starts with settings closed', () => {
    expect(useUIStore.getState().settingsOpen).toBe(false)
  })

  it('openSettings sets settingsOpen to true', () => {
    useUIStore.getState().openSettings()
    expect(useUIStore.getState().settingsOpen).toBe(true)
  })

  it('closeSettings sets settingsOpen to false', () => {
    useUIStore.setState({ settingsOpen: true })
    useUIStore.getState().closeSettings()
    expect(useUIStore.getState().settingsOpen).toBe(false)
  })

  it('toggleSettings flips the state', () => {
    expect(useUIStore.getState().settingsOpen).toBe(false)
    useUIStore.getState().toggleSettings()
    expect(useUIStore.getState().settingsOpen).toBe(true)
    useUIStore.getState().toggleSettings()
    expect(useUIStore.getState().settingsOpen).toBe(false)
  })

  // --- Sidebar ---
  it('starts with sidebar expanded', () => {
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  it('toggleSidebar flips collapsed state', () => {
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
    useUIStore.getState().toggleSidebar()
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  it('setSidebarCollapsed sets explicit value', () => {
    useUIStore.getState().setSidebarCollapsed(true)
    expect(useUIStore.getState().sidebarCollapsed).toBe(true)
    useUIStore.getState().setSidebarCollapsed(false)
    expect(useUIStore.getState().sidebarCollapsed).toBe(false)
  })

  // --- Output mode ---
  it('starts in aligned output mode', () => {
    expect(useUIStore.getState().outputMode).toBe('aligned')
  })

  it('toggleOutputMode switches between aligned and console', () => {
    useUIStore.getState().toggleOutputMode()
    expect(useUIStore.getState().outputMode).toBe('console')
    useUIStore.getState().toggleOutputMode()
    expect(useUIStore.getState().outputMode).toBe('aligned')
  })

  it('setOutputMode sets explicit mode', () => {
    useUIStore.getState().setOutputMode('console')
    expect(useUIStore.getState().outputMode).toBe('console')
    useUIStore.getState().setOutputMode('aligned')
    expect(useUIStore.getState().outputMode).toBe('aligned')
  })
})
