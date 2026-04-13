import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

// Stub navigator.platform before importing the module under test, since
// IS_MAC is captured at module load time.
const originalDescriptor = Object.getOwnPropertyDescriptor(global, 'navigator')

function withPlatform(platform: string, fn: () => void) {
  vi.resetModules()
  Object.defineProperty(global, 'navigator', {
    value: { platform },
    configurable: true,
    writable: true,
  })
  fn()
}

afterEach(() => {
  if (originalDescriptor) {
    Object.defineProperty(global, 'navigator', originalDescriptor)
  } else {
    delete (global as { navigator?: Navigator }).navigator
  }
  vi.resetModules()
})

describe('shortcut (macOS)', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'MacIntel' },
      configurable: true,
      writable: true,
    })
  })

  it('renders ⌘Key with mod default', async () => {
    const { shortcut } = await import('../shortcut')
    expect(shortcut('Enter')).toBe('⌘Enter')
  })

  it('renders ⌘⇧Key with shift', async () => {
    const { shortcut } = await import('../shortcut')
    expect(shortcut('P', { mod: true, shift: true })).toBe('⇧⌘P')
  })

  it('renders ⌥Key with alt only', async () => {
    const { shortcut } = await import('../shortcut')
    expect(shortcut('F', { alt: true })).toBe('⌥F')
  })

  it('renders ⌃Key for ctrl on Mac (distinct from ⌘)', async () => {
    const { shortcut } = await import('../shortcut')
    expect(shortcut('C', { ctrl: true })).toBe('⌃C')
  })

  it('withShortcut wraps label + glyph in parens', async () => {
    const { withShortcut } = await import('../shortcut')
    expect(withShortcut('Run code', 'Enter')).toBe('Run code (⌘Enter)')
  })
})

describe('shortcut (non-Mac)', () => {
  beforeEach(() => {
    vi.resetModules()
    Object.defineProperty(global, 'navigator', {
      value: { platform: 'Win32' },
      configurable: true,
      writable: true,
    })
  })

  it('renders Ctrl+Key with mod default', async () => {
    const { shortcut } = await import('../shortcut')
    expect(shortcut('Enter')).toBe('Ctrl+Enter')
  })

  it('renders Ctrl+Shift+Key with shift', async () => {
    const { shortcut } = await import('../shortcut')
    expect(shortcut('P', { mod: true, shift: true })).toBe('Ctrl+Shift+P')
  })

  it('renders Alt+Key with alt only', async () => {
    const { shortcut } = await import('../shortcut')
    expect(shortcut('F', { alt: true })).toBe('Alt+F')
  })

  it('merges ctrl and mod into a single Ctrl+ prefix', async () => {
    const { shortcut } = await import('../shortcut')
    // { mod: true, ctrl: true } shouldn't duplicate to "Ctrl+Ctrl+"
    expect(shortcut('C', { mod: true, ctrl: true })).toBe('Ctrl+C')
  })

  it('withShortcut wraps label + Ctrl+Key in parens', async () => {
    const { withShortcut } = await import('../shortcut')
    expect(withShortcut('Run code', 'Enter')).toBe('Run code (Ctrl+Enter)')
  })
})
