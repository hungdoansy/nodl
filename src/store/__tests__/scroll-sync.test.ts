import { describe, it, expect, beforeEach } from 'vitest'
import { useScrollSync } from '../scroll-sync'

describe('useScrollSync', () => {
  beforeEach(() => {
    useScrollSync.setState({ scrollTop: 0, source: null })
  })

  it('starts at scroll position 0', () => {
    expect(useScrollSync.getState().scrollTop).toBe(0)
    expect(useScrollSync.getState().source).toBeNull()
  })

  it('setScrollTop updates position and source', () => {
    useScrollSync.getState().setScrollTop(150, 'editor')
    expect(useScrollSync.getState().scrollTop).toBe(150)
    expect(useScrollSync.getState().source).toBe('editor')
  })

  it('tracks source as output', () => {
    useScrollSync.getState().setScrollTop(300, 'output')
    expect(useScrollSync.getState().scrollTop).toBe(300)
    expect(useScrollSync.getState().source).toBe('output')
  })

  it('overwrites previous scroll state', () => {
    useScrollSync.getState().setScrollTop(100, 'editor')
    useScrollSync.getState().setScrollTop(200, 'output')
    expect(useScrollSync.getState().scrollTop).toBe(200)
    expect(useScrollSync.getState().source).toBe('output')
  })
})
