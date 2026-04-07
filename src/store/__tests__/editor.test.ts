import { describe, it, expect, beforeEach } from 'vitest'
import { useEditorStore } from '../editor'

describe('useEditorStore', () => {
  beforeEach(() => {
    useEditorStore.setState({
      code: 'console.log("Hello, nodl! 🚀");\n\nconst sum = (a, b) => a + b;\nconsole.log("2 + 3 =", sum(2, 3));\n',
      language: 'javascript'
    })
  })

  it('has default code', () => {
    expect(useEditorStore.getState().code).toContain('console.log')
  })

  it('has default language as javascript', () => {
    expect(useEditorStore.getState().language).toBe('javascript')
  })

  it('setCode updates code', () => {
    useEditorStore.getState().setCode('const x = 1')
    expect(useEditorStore.getState().code).toBe('const x = 1')
  })

  it('setLanguage updates language', () => {
    useEditorStore.getState().setLanguage('typescript')
    expect(useEditorStore.getState().language).toBe('typescript')
  })
})
