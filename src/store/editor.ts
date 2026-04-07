import { create } from 'zustand'

interface EditorState {
  code: string
  language: 'javascript' | 'typescript'
  setCode: (code: string) => void
  setLanguage: (language: 'javascript' | 'typescript') => void
}

const DEFAULT_CODE = `console.log("Hello, nodl! 🚀");

const sum = (a, b) => a + b;
console.log("2 + 3 =", sum(2, 3));
`

export const useEditorStore = create<EditorState>((set) => ({
  code: DEFAULT_CODE,
  language: 'javascript',
  setCode: (code) => set({ code }),
  setLanguage: (language) => set({ language })
}))
