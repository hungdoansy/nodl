# AST Instrumenter — Implementation Spec

Detailed spec for `instrumentWithAST()`. See [AST_MIGRATION_PLAN.md](./AST_MIGRATION_PLAN.md) for the overall approach.

---

## 1. Expression Wrapping (`__expr__`)

### Rule

Wrap every top-level `ExpressionStatement` with `__expr__(line, expr)`. Only iterate `ast.program.body` — don't recurse into nested blocks.

No `console.*` exclusion. `console.log()` returns `undefined`, and `exprReporter` in `worker.ts` checks `if (value !== undefined)` — it naturally suppresses the return value. Console output is still captured by the console capturer.

### Code

```ts
for (const node of ast.program.body) {
  if (node.type === 'ExpressionStatement') {
    const expr = node.expression
    if (!expr.start || !expr.end || !node.loc) continue
    const line = node.loc.start.line
    s.appendLeft(expr.start, `__expr__(${line}, `)
    s.appendRight(expr.end, `)`)
  }
}
```

### Before/after

| User code | Instrumented output |
|-----------|---------------------|
| `42` | `__expr__(1, 42)` |
| `42 // the answer` | `__expr__(1, 42) // the answer` |
| `/test/gi` | `__expr__(1, /test/gi)` |
| `!someFlag` | `__expr__(1, !someFlag)` |
| `await fetch(url)` | `__expr__(1, await fetch(url))` |
| `console.log("hi")` | `__expr__(1, console.log("hi"))` — returns `undefined`, suppressed at runtime |
| `const x = 1` | `const x = 1` — `VariableDeclaration`, not wrapped |
| Multi-line ternary: `condition\n  ? a\n  : b` | `__expr__(1, condition\n  ? a\n  : b)` — AST spans full range |

### Error recovery

Skip nodes with `!node.start || !node.end || !node.loc`. Valid nodes get wrapped. Invalid regions pass through. esbuild reports the syntax error later.

---

## 2. Line Tracking (`__line__`)

### Rule

Insert `__line__.value = N;` before every statement whose parent is `Program`, `BlockStatement`, or `StaticBlock`.

### Code

```ts
traverse(ast, {
  Statement(path) {
    if (path.isBlockStatement()) return

    const parent = path.parent
    if (parent.type === 'Program' || parent.type === 'BlockStatement' || parent.type === 'StaticBlock') {
      const line = path.node.loc?.start.line
      if (line != null && path.node.start != null) {
        s.appendLeft(path.node.start, `__line__.value = ${line};\n`)
      }
    }
  }
})
```

`@babel/traverse` naturally recurses into arrow function bodies, callback bodies, object method bodies, and IIFEs.

### Where `__line__` IS inserted

- Top level (`Program`)
- Function/arrow bodies, if/for/while/try blocks (`BlockStatement`)
- Class static blocks (`StaticBlock`)

Statement types: `VariableDeclaration`, `ExpressionStatement`, `ReturnStatement`, `ThrowStatement`, `IfStatement`, `ForStatement`, `WhileStatement`, `DoWhileStatement`, `ForInStatement`, `ForOfStatement`, `TryStatement`, `SwitchStatement`, `FunctionDeclaration`, `ClassDeclaration`, `ImportDeclaration`, `ExportNamedDeclaration`, `ExportDefaultDeclaration`.

### Where `__line__` is NOT inserted

- `BlockStatement` itself — container, not a trackable statement
- `EmptyStatement` — lone `;`
- Inside `ClassBody` — only class members allowed
- Inside `SwitchCase` — skipped for consistency with current behavior. AST could fix this later (it's valid to insert before consequent statements).

### Before/after

| Context | Behavior |
|---------|----------|
| `const x = 1` (top level) | `__line__.value = 1;\nconst x = 1` |
| Arrow callback: `arr.map(x => { return x })` | `__line__` before `return` inside arrow body |
| Object method: `{ method() { console.log("hi") } }` | `__line__` before `console.log` |
| IIFE: `(() => { console.log("hi") })()` | `__line__` before `console.log` |
| Class body: `class { method() {} }` | No `__line__` before `method()` (parent is `ClassBody`) |
| Switch case: `case 1: console.log("one")` | No `__line__` (parent is `SwitchCase`) |
| Multiline template literal | Never visited — `TemplateLiteral` is one node |

---

## 3. Import/Export Transformation

### Rule

Convert `import`/`export` statements to `require()` calls. Code runs inside `AsyncFunction` (not a module), so `import` statements are illegal there.

### Code

```ts
traverse(ast, {
  ImportDeclaration(path) {
    const node = path.node
    const source = node.source.value

    if (node.importKind === 'type') {
      s.overwrite(node.start, node.end, '')
      return
    }

    const replacement = buildRequireFromSpecifiers(node.specifiers, source)
    s.overwrite(node.start, node.end, replacement)
  },

  ExportNamedDeclaration(path) {
    const node = path.node
    if (node.source) {
      // Re-export: export { a } from "mod"
      if (node.exportKind === 'type') {
        s.overwrite(node.start, node.end, '')
        return
      }
      const replacement = buildRequireFromReexport(node)
      s.overwrite(node.start, node.end, replacement)
    } else if (node.declaration) {
      // export const x = 1 → const x = 1
      s.overwrite(node.start, node.declaration.start, '')
    }
  },

  ExportDefaultDeclaration(path) {
    // export default expr → expr
    const decl = path.node.declaration
    s.overwrite(path.node.start, decl.start, '')
  }
})
```

### Complete mapping

**Imports:**

| Syntax | Specifier type(s) | Output |
|--------|-------------------|--------|
| `import "mod"` | None | `require("mod")` |
| `import foo from "mod"` | `ImportDefaultSpecifier` | `const foo = (() => { const _m = require("mod"); return _m.default ?? _m; })()` |
| `import * as foo from "mod"` | `ImportNamespaceSpecifier` | `const foo = require("mod")` |
| `import { a, b } from "mod"` | `ImportSpecifier[]` | `const { a, b } = require("mod")` |
| `import { a as x } from "mod"` | `ImportSpecifier` (imported !== local) | `const { a: x } = require("mod")` |
| `import foo, { a, b } from "mod"` | Default + Named | `const foo = ...; const { a, b } = require("mod")` |
| `import type { Foo } from "mod"` | `importKind === 'type'` | `` (stripped) |
| `import { type Foo, bar } from "mod"` | Mixed type/value | `const { bar } = require("mod")` — type specifiers filtered |

**Exports (with source — re-exports):**

| Syntax | Output |
|--------|--------|
| `export { a, b } from "mod"` | `const { a, b } = require("mod")` |
| `export * from "mod"` | `require("mod")` |
| `export type { Foo } from "mod"` | `` (stripped) |

**Exports (without source — local):**

| Syntax | Output |
|--------|--------|
| `export default expr` | `expr` (strip `export default`) |
| `export const x = 1` | `const x = 1` (strip `export`) |
| `export function foo() {}` | `function foo() {}` (strip `export`) |

### Key wins over regex

- **Multi-line imports:** AST sees one `ImportDeclaration` spanning all lines. Regex fails on `import {\n  a,\n  b\n} from "mod"`.
- **Mixed type/value:** `import { type Foo, bar }` — AST gives `spec.importKind === 'type'` per specifier.

---

## 4. Loop Guard Injection

### Rule

Insert `__loopGuard__()` at the start of every loop body. For block bodies, insert after `{`. For single-statement bodies, wrap in a block.

### Code

```ts
traverse(ast, {
  'ForStatement|WhileStatement|DoWhileStatement|ForInStatement|ForOfStatement'(path) {
    const body = path.node.body
    if (body.type === 'BlockStatement') {
      s.appendLeft(body.start + 1, '\n__loopGuard__();')
    } else {
      s.appendLeft(body.start, '{ __loopGuard__(); ')
      s.appendRight(body.end, ' }')
    }
  }
})
```

### Before/after

| User code | Current regex | AST |
|-----------|--------------|-----|
| `for (...) {\n  console.log(i)\n}` | Guard after `{` | Same |
| `while (true) doSomething()` | **No guard** — no `{` | `while (true) { __loopGuard__(); doSomething() }` |
| `for (const x of arr) process(x)` | **No guard** | `for (const x of arr) { __loopGuard__(); process(x) }` |
| `do x++ while (x < 10)` | **No guard** | `do { __loopGuard__(); x++ } while (x < 10)` |
| `for await (x of stream) { ... }` | Fragile | Always handled |
| Labeled loops | Works | Same — label is `LabeledStatement` wrapping the loop |

### All loop types: `ForStatement`, `WhileStatement`, `DoWhileStatement`, `ForInStatement`, `ForOfStatement` (including async).

---

## Tests to Add

Beyond the 100 existing pipeline tests:

**Expression wrapping:**
- Multi-line ternary wrapped as one unit
- Inline comments preserved outside wrapping
- Regex literal `/test/gi` correctly wrapped
- `console.log("hi")` IS wrapped (runtime suppresses `undefined`)
- `void 0` wrapped (returns `undefined`, suppressed)
- Top-level `await fetch(url)` parses correctly

**Line tracking:**
- `__line__` inside arrow function body
- `__line__` inside callback: `arr.map(x => { console.log(x) })`
- `__line__` inside object method
- `__line__` inside class `static { ... }` block
- `__line__` NOT inside class body
- `__line__` NOT inside object literal
- Multiline template literal — no `__line__` between lines

**Imports:**
- Multi-line import with 10+ specifiers
- `import { type Foo, bar }` mixed specifiers
- `import foo, * as ns from "mod"`
- `export default 42`
- `export const x = 1`
- `export { type A, b } from "mod"`

**Loop guards:**
- `while (true) doSomething()` — single-statement body
- `for (x of arr) process(x)` — for...of without braces
- `do x++ while (x < 10)` — do...while without braces
- `for await (x of stream) { ... }` — async iteration
- Nested loops — both get guards
- Labeled loops — guard doesn't break label

**Error recovery:**
- Incomplete code (`const x =`) — valid parts still instrumented
- Syntax error on one line — other lines still instrumented
