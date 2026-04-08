import { transformSync, type Message } from 'esbuild'

export interface TranspileError {
  line: number
  column: number
  message: string
}

export interface TranspileResult {
  js: string
  errors: TranspileError[]
}

export function transpile(code: string, loader: 'ts' | 'tsx' = 'ts'): TranspileResult {
  try {
    const result = transformSync(code, {
      loader,
      target: 'esnext',
      jsx: 'automatic',
      sourcemap: false
    })

    // Strip esbuild's /* @__PURE__ */ annotations — they break the
    // worker's expression detection which skips lines starting with /*
    const js = result.code.replace(/\/\* @__PURE__ \*\/ /g, '')

    return {
      js,
      errors: result.warnings.map(messageToError)
    }
  } catch (err: unknown) {
    const buildError = err as { errors?: Message[] }
    if (buildError.errors?.length) {
      return {
        js: '',
        errors: buildError.errors.map(messageToError)
      }
    }
    return {
      js: '',
      errors: [{ line: 0, column: 0, message: String(err) }]
    }
  }
}

function messageToError(msg: Message): TranspileError {
  return {
    line: msg.location?.line ?? 0,
    column: msg.location?.column ?? 0,
    message: msg.text
  }
}
