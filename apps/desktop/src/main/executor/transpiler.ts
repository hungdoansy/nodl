import { transformSync, type Message } from 'esbuild'

export interface TranspileError {
  line: number
  column: number
  message: string
}

export interface TranspileResult {
  js: string
  errors: TranspileError[]
  /** Non-fatal lint hints (e.g. `x === -0`) — valid code, must not block execution */
  warnings: TranspileError[]
}

/**
 * Always the plain `ts` loader — JSX is not supported. In `tsx` mode valid TS
 * like `<T>(x: T) => x` and `<string>v` is parsed as JSX and fails.
 */
export function transpile(code: string): TranspileResult {
  try {
    const result = transformSync(code, {
      loader: 'ts',
      target: 'esnext',
      // V8 can't run decorators yet, and `esnext` passes them through untouched —
      // lower standard (TS 5 default) decorators and `accessor` fields to plain JS
      supported: { decorators: false },
      sourcemap: false
    })

    // Strip esbuild's /* @__PURE__ */ annotations — they break our
    // expression detection (isExpression rejects lines starting with /*).
    // Only strip the exact esbuild pattern, not arbitrary user comments.
    const js = result.code.replace(/\/\* @__PURE__ \*\/ /g, '')

    return {
      js,
      errors: [],
      warnings: result.warnings.map(messageToError)
    }
  } catch (err: unknown) {
    const buildError = err as { errors?: Message[] }
    if (buildError.errors?.length) {
      return {
        js: '',
        errors: buildError.errors.map(messageToError),
        warnings: []
      }
    }
    return {
      js: '',
      errors: [{ line: 0, column: 0, message: String(err) }],
      warnings: []
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

/**
 * Transpile instrumented code, but report errors against the user's source.
 * When the source itself is invalid, Babel can't parse it and the regex fallback
 * instrumenter may mangle it further (e.g. multi-line imports), producing errors
 * at unrelated lines — so if the instrumented code fails and the source fails too,
 * the source's errors are the ones the user needs to see.
 */
export function transpileInstrumented(source: string, instrumented: string): TranspileResult {
  const result = transpile(instrumented)
  if (result.errors.length === 0) return result
  const original = transpile(source)
  return original.errors.length > 0 ? original : result
}
