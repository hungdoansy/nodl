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

  it('subscribers are notified on scroll change', () => {
    const values: number[] = []
    const unsub = useScrollSync.subscribe((state) => {
      values.push(state.scrollTop)
    })
    useScrollSync.getState().setScrollTop(100, 'editor')
    useScrollSync.getState().setScrollTop(250, 'editor')
    unsub()
    useScrollSync.getState().setScrollTop(999, 'editor')
    expect(values).toEqual([100, 250])
  })

  it('getState returns current position for re-sync after content change', () => {
    // Simulates the fix: output reads editor's current position when entries change
    useScrollSync.getState().setScrollTop(500, 'editor')
    // After new output arrives, output panel reads current state to re-sync
    const { scrollTop } = useScrollSync.getState()
    expect(scrollTop).toBe(500)
  })
})
