import { describe, it, expect, beforeEach } from 'vitest'
import { useUIStore } from '../ui'

describe('useUIStore', () => {
  beforeEach(() => {
    useUIStore.setState({ settingsOpen: false })
  })

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
})
