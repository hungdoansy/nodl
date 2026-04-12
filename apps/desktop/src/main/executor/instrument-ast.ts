/**
 * AST-based code instrumenter using @babel/parser + @babel/traverse + magic-string.
 *
 * Applies four transformations to the original source (before esbuild transpilation):
 *   1. __expr__(line, value) — wraps top-level ExpressionStatements to capture values
 *   2. __line__.value = N   — inserts line tracking before each statement in a block context
 *   3. require()            — transforms ESM import/export → require() (AsyncFunction context)
 *   4. __loopGuard__()      — injects loop guard into every loop body (infinite loop protection)
 *
 * Uses magic-string to manipulate the source by character offsets, preserving original
 * line numbers so esbuild's output matches the editor.
 */

import { parse } from '@babel/parser'
import MagicString from 'magic-string'
import type {
  ImportDeclaration,
  ImportSpecifier,
  ImportDefaultSpecifier,
  ImportNamespaceSpecifier,
  ExportNamedDeclaration,
  ExportSpecifier,
  File,
} from '@babel/types'

// @babel/traverse has CJS/ESM interop issues — handle both forms
// eslint-disable-next-line @typescript-eslint/no-require-imports
const traverseImport = require('@babel/traverse') as { default?: Function } & Function
const traverse: Function = traverseImport.default ?? traverseImport

// -------------------------------------------------------------------
// Parser configuration
// -------------------------------------------------------------------

const PARSER_OPTIONS = {
  sourceType: 'module' as const,
  allowImportExportEverywhere: true, // Permissive: scratchpad code may be unusual
  allowAwaitOutsideFunction: true,   // Top-level await support
  allowReturnOutsideFunction: true,  // Bare return is valid in scratchpad
  errorRecovery: true,               // Partial AST on incomplete/invalid code
  plugins: ['typescript', 'jsx'] as ('typescript' | 'jsx')[],
  ranges: true,                      // Provide start/end character offsets
}

// -------------------------------------------------------------------
// Import/export transformation helpers
// -------------------------------------------------------------------

/**
 * Get the original quoted source string (preserving single vs double quotes).
 * e.g. import x from 'foo' → sourceRaw is "'foo'"
 */
function rawSource(node: { value: string; extra?: Record<string, unknown> }): string {
  return (node.extra?.raw as string | undefined) ?? `"${node.value}"`
}

/**
 * Build a require() call for a set of import specifiers.
 *
 * import "mod"            → require("mod")
 * import foo from "mod"   → const foo = (() => { const _m = require("mod"); return _m.default ?? _m; })()
 * import * as ns from "m" → const ns = require("m")
 * import { a, b } from   → const { a, b } = require("mod")
 * import foo, { a } from → default + named combined
 */
function buildRequire(
  specifiers: ImportDeclaration['specifiers'],
  sourceRaw: string
): string {
  if (specifiers.length === 0) {
    return `require(${sourceRaw})`
  }

  const parts: string[] = []

  const defaultSpec = specifiers.find(
    (s): s is ImportDefaultSpecifier => s.type === 'ImportDefaultSpecifier'
  )
  const namespaceSpec = specifiers.find(
    (s): s is ImportNamespaceSpecifier => s.type === 'ImportNamespaceSpecifier'
  )
  const namedSpecs = specifiers.filter(
    (s): s is ImportSpecifier =>
      s.type === 'ImportSpecifier' && s.importKind !== 'type'
  )

  if (defaultSpec) {
    const name = defaultSpec.local.name
    parts.push(
      `const ${name} = (() => { const _m = require(${sourceRaw}); return _m.default ?? _m; })()`
    )
  }

  if (namespaceSpec) {
    parts.push(`const ${namespaceSpec.local.name} = require(${sourceRaw})`)
  }

  if (namedSpecs.length > 0) {
    const specStr = namedSpecs
      .map((s) => {
        // imported can be Identifier or StringLiteral (for `import { "foo" as bar }`)
        const importedName =
          s.imported.type === 'Identifier' ? s.imported.name : s.imported.value
        const localName = s.local.name
        return importedName === localName ? importedName : `${importedName}: ${localName}`
      })
      .join(', ')
    parts.push(`const { ${specStr} } = require(${sourceRaw})`)
  }

  return parts.join('; ')
}

/**
 * Build a require() for a re-export with source: export { a, b } from "mod"
 */
function buildReexportRequire(node: ExportNamedDeclaration): string {
  const sourceRaw = rawSource(node.source!)
  const valueSpecs = (node.specifiers as ExportSpecifier[]).filter(
    (s) => s.exportKind !== 'type'
  )
  if (valueSpecs.length === 0) return '' // all type exports → strip

  const specStr = valueSpecs
    .map((s) => {
      // local is the imported name from the source module
      return s.local.type === 'Identifier' ? s.local.name : (s.local as any).value
    })
    .join(', ')
  return `const { ${specStr} } = require(${sourceRaw})`
}

// -------------------------------------------------------------------
// Main instrumenter
// -------------------------------------------------------------------

export function instrumentWithAST(code: string): string {
  const ast = parse(code, PARSER_OPTIONS) as File
  const s = new MagicString(code)

  // Shared loop body handler for all loop types
  const injectLoopGuard = (path: any): void => {
    const body = path.node.body
    if (body == null || body.start == null || body.end == null) return

    if (body.type === 'BlockStatement') {
      // Insert after the opening {
      s.appendLeft(body.start + 1, '\n__loopGuard__();')
    } else {
      // Single-statement body — wrap in a block
      s.appendLeft(body.start, '{ __loopGuard__(); ')
      s.appendRight(body.end, ' }')
    }
  }

  // -------------------------------------------------------------------
  // Pass 1: traverse — __line__ tracking, import/export transforms,
  //                     loop guards
  //
  // Done FIRST so that appendLeft calls for __line__ at a given position
  // come before the __expr__ appendLeft calls in Pass 2 (which are at the
  // same position for top-level ExpressionStatements). magic-string
  // accumulates appendLeft calls left-to-right, so the first call ends up
  // leftmost in the output.
  // -------------------------------------------------------------------

  traverse(ast, {
    // Insert __line__.value = N before every statement whose parent is a
    // block-level context (Program, BlockStatement, StaticBlock).
    Statement(path: any): void {
      // BlockStatement is a container, not a trackable statement itself
      if (path.isBlockStatement() || path.isEmptyStatement()) return

      const parent = path.parent
      if (
        parent.type === 'Program' ||
        parent.type === 'BlockStatement' ||
        parent.type === 'StaticBlock'
      ) {
        const line = path.node.loc?.start.line
        if (line != null && path.node.start != null) {
          s.appendLeft(path.node.start, `__line__.value = ${line};\n`)
        }
      }
    },

    // Transform ESM imports → require()
    ImportDeclaration(path: any): void {
      const node = path.node as ImportDeclaration
      if (node.start == null || node.end == null) return

      // import type { Foo } → strip entirely (no runtime effect)
      if (node.importKind === 'type') {
        s.overwrite(node.start, node.end, '')
        return
      }

      const sourceRaw = rawSource(node.source)
      s.overwrite(node.start, node.end, buildRequire(node.specifiers, sourceRaw))
    },

    // Transform export named → strip export keyword or require() for re-exports
    ExportNamedDeclaration(path: any): void {
      const node = path.node as ExportNamedDeclaration
      if (node.start == null || node.end == null) return

      if (node.source) {
        // export { a, b } from "mod" or export type { ... } from "mod"
        if (node.exportKind === 'type') {
          s.overwrite(node.start, node.end, '')
          return
        }
        const replacement = buildReexportRequire(node)
        s.overwrite(node.start, node.end, replacement)
      } else if (node.declaration) {
        // export const x = 1 → const x = 1 (strip "export ")
        const decl = node.declaration as any
        if (decl.start != null) {
          s.overwrite(node.start, decl.start, '')
        }
      }
      // export { a, b } without source: local re-export, unusual in scratchpad
      // Leave as-is — will fail at runtime in AsyncFunction context, which is
      // expected behaviour (same as current regex instrumenter).
    },

    // export default expr → expr (strip "export default ")
    ExportDefaultDeclaration(path: any): void {
      const node = path.node
      if (node.start == null || node.end == null) return
      const decl = node.declaration as any
      if (decl.start != null) {
        s.overwrite(node.start, decl.start, '')
      }
    },

    // export * from "mod" → require("mod")
    ExportAllDeclaration(path: any): void {
      const node = path.node
      if (node.start == null || node.end == null) return
      if (node.exportKind === 'type') {
        s.overwrite(node.start, node.end, '')
        return
      }
      const sourceRaw = rawSource(node.source)
      s.overwrite(node.start, node.end, `require(${sourceRaw})`)
    },

    // Inject loop guards into all loop types
    ForStatement: injectLoopGuard,
    WhileStatement: injectLoopGuard,
    DoWhileStatement: injectLoopGuard,
    ForInStatement: injectLoopGuard,
    ForOfStatement: injectLoopGuard,
  })

  // -------------------------------------------------------------------
  // Pass 2: top-level __expr__ wrapping
  //
  // Only wraps ExpressionStatements directly in program.body (not nested).
  // Done AFTER Pass 1 so __line__ insertions (appendLeft) at the same
  // position come before __expr__ insertions (also appendLeft).
  // -------------------------------------------------------------------

  for (const node of ast.program.body) {
    if (node.type !== 'ExpressionStatement') continue

    const expr = node.expression
    if (expr.start == null || expr.end == null || !node.loc) continue

    const line = node.loc.start.line
    s.appendLeft(expr.start, `__expr__(${line}, `)
    s.appendRight(expr.end, `)`)
  }

  return s.toString()
}
