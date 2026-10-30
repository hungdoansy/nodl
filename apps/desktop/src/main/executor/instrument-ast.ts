/**
 * AST-based code instrumenter using @babel/parser + @babel/traverse + magic-string.
 *
 * Applies four transformations to the original source (before esbuild transpilation):
 *   1. __expr__(line, value) — wraps top-level ExpressionStatements to capture values
 *   2. __line__.value = N   — inserts line tracking before each statement in a block context
 *   3. require()            — transforms ESM import/export → require() (AsyncFunction context)
 *   4. __loopGuard__()      — injects loop guard into every loop body (infinite loop protection)
 *
 * Uses magic-string to manipulate the source by character offsets. Every insertion is
 * newline-free and every replacement keeps the replaced span's newline count, so line N
 * of the output is line N of the source — esbuild error/warning lines match the editor.
 */

import { parse, type ParserPlugin } from '@babel/parser'
import MagicString from 'magic-string'
import { getBindingIdentifiers, isValidIdentifier } from '@babel/types'
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
  // no 'jsx': it makes `<T>(x) => x` and `<string>v` ambiguous. Decorator plugins: without
  // them Babel throws on `@dec`/`accessor` and the code falls to the regex instrumenter
  plugins: ['typescript', 'decorators', 'decoratorAutoAccessors'] as ParserPlugin[],
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
  sourceRaw: string,
  req: string
): string {
  if (specifiers.length === 0) {
    return `${req}(${sourceRaw})`
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
      `const ${name} = (() => { const _m = ${req}(${sourceRaw}); return _m.default ?? _m; })()`
    )
  }

  if (namespaceSpec) {
    parts.push(`const ${namespaceSpec.local.name} = ${req}(${sourceRaw})`)
  }

  if (namedSpecs.length > 0) {
    const specStr = namedSpecs
      .map((s) => {
        // imported can be Identifier or StringLiteral (for `import { "foo" as bar }`)
        const importedName = moduleExportName(s.imported)
        const localName = s.local.name
        return importedName === localName ? importedName : `${propertyKey(importedName)}: ${localName}`
      })
      .join(', ')
    parts.push(`const { ${specStr} } = ${req}(${sourceRaw})`)
  }

  return parts.join('; ')
}

/** Name of an import/export specifier — `{ "a-b" as c }` uses a string literal */
function moduleExportName(node: { type: string; name?: string; value?: string }): string {
  return node.type === 'Identifier' ? node.name! : node.value!
}

/** A destructuring key: bare when it's an identifier name, quoted otherwise */
function propertyKey(name: string): string {
  return /^[A-Za-z_$][\w$]*$/.test(name) ? name : JSON.stringify(name)
}

/**
 * Build a require() for a re-export with source: export { a, b as c } from "mod".
 *
 * Scratchpad convenience: the exported names also become local bindings
 * (`const { a, b: c } = require("mod")`), unless the name can't be a binding
 * (`default`, string names) or is already declared — a collision would be a
 * SyntaxError. `export * as ns from "mod"` → `const ns = require("mod")`.
 * With no bindings left it's just `require("mod")`, which still loads the module.
 */
function buildReexportRequire(node: ExportNamedDeclaration, declared: Set<string>, req: string): string {
  const sourceRaw = rawSource(node.source!)
  const valueSpecs = node.specifiers.filter((s) => (s as ExportSpecifier).exportKind !== 'type')
  if (valueSpecs.length === 0) return '' // all type exports → strip

  const props: string[] = []
  const parts: string[] = []
  for (const spec of valueSpecs) {
    const exported = moduleExportName(spec.exported)
    if (!isValidIdentifier(exported) || declared.has(exported)) continue
    declared.add(exported)
    if (spec.type === 'ExportNamespaceSpecifier') {
      parts.push(`const ${exported} = ${req}(${sourceRaw})`)
    } else if (spec.type === 'ExportSpecifier') {
      const imported = moduleExportName(spec.local)
      props.push(imported === exported ? exported : `${propertyKey(imported)}: ${exported}`)
    }
  }
  if (props.length > 0) parts.push(`const { ${props.join(', ')} } = ${req}(${sourceRaw})`)
  return parts.length > 0 ? parts.join('; ') : `${req}(${sourceRaw})`
}

/** Names declared at the top level — re-export bindings must not collide with them */
function topLevelNames(program: File['program']): Set<string> {
  const names = new Set<string>()
  for (const stmt of program.body) {
    if (stmt.type === 'ExportNamedDeclaration' && stmt.source) continue
    for (const name of Object.keys(getBindingIdentifiers(stmt))) names.add(name)
    const id = (stmt as { id?: { type: string; name?: string } }).id // TS enum / namespace
    if (id?.type === 'Identifier') names.add(id.name!)
  }
  return names
}

/**
 * Overwrite [start, end) with `text`, padded with the newlines the original span had,
 * so lines after a multi-line import/export keep their numbers.
 */
function overwriteKeepLines(s: MagicString, code: string, start: number, end: number, text: string): void {
  const newlines = code.slice(start, end).split('\n').length - 1
  s.overwrite(start, end, text + '\n'.repeat(newlines))
}

/**
 * Import/export rewriting applies to the scratchpad's own top level only. Inside a
 * `namespace` or `declare module` block, `export` declares a namespace member —
 * esbuild compiles that itself, and stripping it would leave the member undefined.
 */
function isModuleLevel(path: any): boolean {
  return path.parent.type === 'Program'
}

/**
 * Replace `export ` / `export default ` in front of a declaration (default: remove it).
 * With decorators before the keyword (`@dec export class A {}`) the class node starts
 * at the decorator, so the keyword sits inside it, after the last decorator.
 */
function stripExportKeyword(s: MagicString, code: string, exportStart: number, decl: any, replacement = ''): void {
  // Match the keyword text itself: a range up to decl.start would also eat the
  // `(` of `export default (expr)`
  const from = exportStart < decl.start ? exportStart : decl.decorators?.at(-1)?.end ?? exportStart
  const keyword = /export\s+(default\s+)?/.exec(code.slice(from))
  if (keyword) overwriteKeepLines(s, code, from + keyword.index, from + keyword.index + keyword[0].length, replacement)
}

// -------------------------------------------------------------------
// Main instrumenter
// -------------------------------------------------------------------

const LOOP_TYPES = new Set([
  'ForStatement', 'WhileStatement', 'DoWhileStatement', 'ForInStatement', 'ForOfStatement',
])

export function instrumentWithAST(code: string): string {
  const ast = parse(code, PARSER_OPTIONS) as File
  const s = new MagicString(code)
  const declared = topLevelNames(ast.program)
  // `import { createRequire } from 'module'; const require = createRequire(…)` declares
  // its own require — imports rewritten above it would hit its TDZ, so they use the
  // worker's alias instead
  const req = declared.has('require') ? '__require__' : 'require'

  // Shared loop body handler for all loop types
  const injectLoopGuard = (path: any): void => {
    const body = path.node.body
    if (body == null || body.start == null || body.end == null) return

    if (body.type === 'BlockStatement') {
      // Insert after the opening {
      s.appendLeft(body.start + 1, ' __loopGuard__();')
    } else {
      // Single-statement body — wrap in a block
      s.appendLeft(body.start, '{ __loopGuard__(); ')
      // appendLeft, not appendRight: a statement starting right at body.end
      // (`for (…) foo;bar()`) gets its __line__ prefix appended left at the same
      // position, and appendRight content would land after that prefix
      s.appendLeft(body.end, ' }')
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
    // No scope tracking: the visitors don't need it, and Babel's scope crawl throws
    // "Duplicate declaration" on valid TS (`import type X` + `let X`), which would
    // drop the code to the regex fallback
    noScope: true,

    // Insert __line__.value = N before every statement in a statement list
    // (Program, BlockStatement, StaticBlock, switch case) and before brace-less
    // if/else/loop bodies — otherwise `if (c)\n  console.log(x)` reports the `if` line.
    Statement(path: any): void {
      // BlockStatement is a container, not a trackable statement itself
      if (path.isBlockStatement() || path.isEmptyStatement()) return

      const { node, parent } = path
      const line = node.loc?.start.line
      if (line == null || node.start == null || node.end == null) return
      const track = `__line__.value = ${line}; `

      if (
        parent.type === 'Program' ||
        parent.type === 'BlockStatement' ||
        parent.type === 'StaticBlock' ||
        parent.type === 'SwitchCase'
      ) {
        s.appendLeft(node.start, track)
      } else if (LOOP_TYPES.has(parent.type) && path.key === 'body') {
        // injectLoopGuard already wrapped the body in `{ __loopGuard__(); … }`
        s.appendLeft(node.start, track)
      } else if (
        (parent.type === 'IfStatement' && path.key !== 'test') ||
        parent.type === 'WithStatement'
      ) {
        // `else if` chains track their own bodies; a function declaration as a
        // body (annex B) would change scope if wrapped
        if (path.isIfStatement() || path.isFunctionDeclaration()) return
        s.appendLeft(node.start, `{ ${track}`)
        // appendLeft: see injectLoopGuard
        s.appendLeft(node.end, ' }')
      }
    },

    // Transform ESM imports → require()
    ImportDeclaration(path: any): void {
      const node = path.node as ImportDeclaration
      if (node.start == null || node.end == null || !isModuleLevel(path)) return

      // import type { Foo } → strip entirely (no runtime effect)
      if (node.importKind === 'type') {
        overwriteKeepLines(s, code, node.start, node.end, '')
        return
      }

      const sourceRaw = rawSource(node.source)
      overwriteKeepLines(s, code, node.start, node.end, buildRequire(node.specifiers, sourceRaw, req))
    },

    // Transform export named → strip export keyword or require() for re-exports
    ExportNamedDeclaration(path: any): void {
      const node = path.node as ExportNamedDeclaration
      if (node.start == null || node.end == null || !isModuleLevel(path)) return

      if (node.source) {
        // export { a, b } from "mod" or export type { ... } from "mod"
        if (node.exportKind === 'type') {
          overwriteKeepLines(s, code, node.start, node.end, '')
          return
        }
        const replacement = buildReexportRequire(node, declared, req)
        overwriteKeepLines(s, code, node.start, node.end, replacement)
      } else if (node.declaration) {
        // export const x = 1 → const x = 1 (strip "export ")
        const decl = node.declaration as any
        if (decl.start != null) stripExportKeyword(s, code, node.start, decl)
      } else {
        // export { a, b as c } of local names: the names already exist — nothing to do
        overwriteKeepLines(s, code, node.start, node.end, '')
      }
    },

    // export default function f() {} → function f() {} (named declarations stay usable)
    // export default expr / anonymous function or class → (expr): anonymous
    // declarations are invalid on their own, and `export default { a: 1 }` stripped
    // to `{ a: 1 }` would parse as a block
    ExportDefaultDeclaration(path: any): void {
      const node = path.node
      if (node.start == null || node.end == null || !isModuleLevel(path)) return
      const decl = node.declaration as any
      if (decl.start == null) return
      const isNamedDeclaration =
        decl.id != null || decl.type === 'TSInterfaceDeclaration' || decl.type === 'TSDeclareFunction'
      if (isNamedDeclaration) {
        stripExportKeyword(s, code, node.start, decl)
      } else {
        stripExportKeyword(s, code, node.start, decl, '(')
        // An anonymous declaration ends without `;` (`export default function () {} next()`),
        // so the new expression needs one. Expressions can't take it: their end may sit
        // inside the source's own parens — `export default (expr)`
        const isDeclaration = decl.type === 'FunctionDeclaration' || decl.type === 'ClassDeclaration'
        s.appendLeft(decl.end, isDeclaration ? ');' : ')')
      }
    },

    // export * from "mod" → require("mod")
    ExportAllDeclaration(path: any): void {
      const node = path.node
      if (node.start == null || node.end == null || !isModuleLevel(path)) return
      if (node.exportKind === 'type') {
        overwriteKeepLines(s, code, node.start, node.end, '')
        return
      }
      const sourceRaw = rawSource(node.source)
      overwriteKeepLines(s, code, node.start, node.end, `${req}(${sourceRaw})`)
    },

    // import.meta is module-only syntax; the worker passes an equivalent object
    MetaProperty(path: any): void {
      const node = path.node
      if (node.meta.name === 'import' && node.property.name === 'meta') {
        s.overwrite(node.start, node.end, '__importMeta__')
      }
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
    // `a, b` must stay one argument: __expr__(1, (a, b)), not __expr__(1, a, b).
    // Also when parenthesized — expr.start is inside the source's own parens
    const isSequence = expr.type === 'SequenceExpression'
    s.appendLeft(expr.start, `__expr__(${line}, ${isSequence ? '(' : ''}`)
    s.appendRight(expr.end, isSequence ? '))' : ')')
  }

  return s.toString()
}
