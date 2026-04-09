import { describe, it, expect, beforeEach, vi } from 'vitest'
import { usePackagesStore } from '../packages'

// Mock the bridge module
vi.mock('../../ipc/bridge', () => ({
  listPackages: vi.fn().mockResolvedValue([
    { name: 'lodash', version: '4.17.21' },
    { name: 'axios', version: '1.6.0' }
  ]),
  installPackage: vi.fn().mockResolvedValue({ success: true, name: 'dayjs', version: '1.11.10' }),
  removePackage: vi.fn().mockResolvedValue({ success: true, name: 'lodash' }),
  searchPackages: vi.fn().mockResolvedValue([])
}))

describe('usePackagesStore', () => {
  beforeEach(() => {
    usePackagesStore.setState({
      packages: [],
      installing: null,
      removing: null,
      error: null
    })
  })

  it('starts with empty state', () => {
    const state = usePackagesStore.getState()
    expect(state.packages).toEqual([])
    expect(state.installing).toBeNull()
    expect(state.removing).toBeNull()
    expect(state.error).toBeNull()
  })

  it('loadPackages fetches from bridge', async () => {
    await usePackagesStore.getState().loadPackages()
    const state = usePackagesStore.getState()
    expect(state.packages).toHaveLength(2)
    expect(state.packages[0].name).toBe('lodash')
  })

  it('install sets installing state and clears on success', async () => {
    const result = await usePackagesStore.getState().install('dayjs')
    expect(result).toBe(true)
    const state = usePackagesStore.getState()
    expect(state.installing).toBeNull()
    // loadPackages is called after install, so packages are loaded
    expect(state.packages).toHaveLength(2)
  })

  it('install sets error on failure', async () => {
    const bridge = await import('../../ipc/bridge')
    vi.mocked(bridge.installPackage).mockResolvedValueOnce({
      success: false,
      name: 'bad-pkg',
      error: 'Not found'
    })

    const result = await usePackagesStore.getState().install('bad-pkg')
    expect(result).toBe(false)
    expect(usePackagesStore.getState().error).toBe('Not found')
    expect(usePackagesStore.getState().installing).toBeNull()
  })

  it('remove removes package and refreshes list', async () => {
    await usePackagesStore.getState().loadPackages()
    const result = await usePackagesStore.getState().remove('lodash')
    expect(result).toBe(true)
    expect(usePackagesStore.getState().removing).toBeNull()
  })

  it('remove sets error on failure', async () => {
    const bridge = await import('../../ipc/bridge')
    vi.mocked(bridge.removePackage).mockResolvedValueOnce({
      success: false,
      name: 'lodash',
      error: 'Failed to remove'
    })

    const result = await usePackagesStore.getState().remove('lodash')
    expect(result).toBe(false)
    expect(usePackagesStore.getState().error).toBe('Failed to remove')
  })

  it('clearError clears the error', () => {
    usePackagesStore.setState({ error: 'some error' })
    usePackagesStore.getState().clearError()
    expect(usePackagesStore.getState().error).toBeNull()
  })
})
