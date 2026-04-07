import { describe, it, expect, beforeEach } from 'vitest'
import { useSettingsStore } from '../settings'
import { DEFAULT_SETTINGS } from '../../../shared/types'

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({ ...DEFAULT_SETTINGS })
  })

  it('starts with default settings', () => {
    const state = useSettingsStore.getState()
    expect(state.fontSize).toBe(14)
    expect(state.tabSize).toBe(2)
    expect(state.wordWrap).toBe(true)
    expect(state.minimap).toBe(false)
    expect(state.autoRunEnabled).toBe(false)
    expect(state.autoRunDelay).toBe(300)
    expect(state.executionTimeout).toBe(5)
    expect(state.theme).toBe('dark')
  })

  it('setSetting updates a single setting', () => {
    useSettingsStore.getState().setSetting('fontSize', 18)
    expect(useSettingsStore.getState().fontSize).toBe(18)
  })

  it('setSetting does not affect other settings', () => {
    useSettingsStore.getState().setSetting('fontSize', 20)
    expect(useSettingsStore.getState().tabSize).toBe(2)
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  it('setTheme updates theme', () => {
    useSettingsStore.getState().setTheme('light')
    expect(useSettingsStore.getState().theme).toBe('light')
  })

  it('setTheme cycles through modes', () => {
    useSettingsStore.getState().setTheme('light')
    expect(useSettingsStore.getState().theme).toBe('light')
    useSettingsStore.getState().setTheme('system')
    expect(useSettingsStore.getState().theme).toBe('system')
    useSettingsStore.getState().setTheme('dark')
    expect(useSettingsStore.getState().theme).toBe('dark')
  })

  it('restoreSettings replaces all settings', () => {
    const custom = {
      fontSize: 20,
      tabSize: 4,
      wordWrap: false,
      minimap: true,
      autoRunEnabled: true,
      autoRunDelay: 500,
      executionTimeout: 10,
      theme: 'light' as const
    }
    useSettingsStore.getState().restoreSettings(custom)
    const state = useSettingsStore.getState()
    expect(state.fontSize).toBe(20)
    expect(state.tabSize).toBe(4)
    expect(state.wordWrap).toBe(false)
    expect(state.minimap).toBe(true)
    expect(state.autoRunEnabled).toBe(true)
    expect(state.autoRunDelay).toBe(500)
    expect(state.executionTimeout).toBe(10)
    expect(state.theme).toBe('light')
  })

  it('resetToDefaults restores all defaults', () => {
    useSettingsStore.getState().setSetting('fontSize', 24)
    useSettingsStore.getState().setTheme('light')
    useSettingsStore.getState().setSetting('tabSize', 4)
    useSettingsStore.getState().resetToDefaults()
    const state = useSettingsStore.getState()
    expect(state.fontSize).toBe(14)
    expect(state.theme).toBe('dark')
    expect(state.tabSize).toBe(2)
  })

  it('setSetting handles boolean settings', () => {
    useSettingsStore.getState().setSetting('wordWrap', false)
    expect(useSettingsStore.getState().wordWrap).toBe(false)
    useSettingsStore.getState().setSetting('minimap', true)
    expect(useSettingsStore.getState().minimap).toBe(true)
  })

  it('setSetting handles numeric range values', () => {
    useSettingsStore.getState().setSetting('autoRunDelay', 2000)
    expect(useSettingsStore.getState().autoRunDelay).toBe(2000)
    useSettingsStore.getState().setSetting('executionTimeout', 30)
    expect(useSettingsStore.getState().executionTimeout).toBe(30)
  })
})
