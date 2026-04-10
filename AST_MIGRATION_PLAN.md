# AST Migration Plan for `instrumentCode()`

## Problem

The current instrumenter (`apps/desktop/src/main/executor/instrument.ts`) is a ~300-line hand-rolled parser using regex and character scanning. It reimplements what a real parser already does — tracking strings, comments, brackets, expression boundaries — and gets it wrong in edge cases.

Every fix adds another band-aid:
- Delimiter stack for class/object/switch contexts
- Template literal state tracking across lines
- Comment detection to avoid flipping template state
- `stripInlineComment()` to avoid swallowing `__expr__` closing parens
- `isChainContinuation()` for arrow/ternary/optional chaining
- `isExpression()` with 15+ rejection heuristics

This is unsustainable. A proper AST gives us all of this for free, correctly.

---

## Why Phased Migration (Not a Full Rewrite)

We could rewrite `instrumentCode()` in one shot. But that's risky:

1. **The function does 4 independent things:** expression wrapping, line tracking, import transformation, and loop guard injection. Each has its own test surface. Rewriting all at once means if tests break, you can't tell which part caused it.

2. **The output format changes.** The regex instrumenter produces output like `__line__.value = 1;\nconst x = 1` (separate lines). The AST instrumenter may produce `__line__.value = 1;\nconst x = 1` or `__line__.value = 1; const x = 1` depending on where `magic-string` inserts. Tests need to be adapted per-phase, not all at once.

3. **We can ship value early.** Phase 1 (expression detection) eliminates the most bugs on its own. If the project stalls after Phase 1, we still got the highest-value fix.

4. **Fallback is simpler.** If we keep the regex version as a fallback, it's easier to reason about which parts are AST-powered and which aren't when they coexist during migration.

---

## Proposed Stack

```
@babel/parser          →  AST with source positions
  errorRecovery: true     (handles incomplete/invalid code)
  plugins: [typescript]    (handles TS without transpiling first)

magic-string           →  Source manipulation by character position
                           (preserves original formatting + line numbers)
```

### Why `@babel/parser` (not `esbuild`, `acorn`, `ts-morph`, or `swc`)?

We already use **esbuild** for transpilation, so it's tempting. But esbuild doesn't expose an AST — it's a transpiler, not a parser. No node types, no traversal, no position data we can use for instrumentation.

**acorn** is tiny (~130KB) and fast, but it doesn't parse TypeScript or JSX natively. We'd need `acorn-typescript` and `acorn-jsx` plugins, and their error recovery is weaker. Since our users write TS constantly, this is a dealbreaker.

**ts-morph / TypeScript compiler API** parses TS perfectly, but it's massive (~50MB), slow to initialize, and its AST is complex (deeply nested `SyntaxKind` enums). Overkill for instrumentation.

**swc** is fast but its JS AST bindings are less mature, and `errorRecovery` support is limited. Babel's `errorRecovery: true` is battle-tested — it's what every major IDE uses.

**`@babel/parser`** hits the sweet spot: supports TS + JSX, has `errorRecovery: true` that returns partial ASTs for incomplete code (critical for a scratchpad where users type half-finished expressions), has excellent source position data, and is ~500KB (runs in the main process only, not bundled into the renderer).

### Why `magic-string` (not `@babel/generator` or string concatenation)?

The key constraint: **instrumentation must preserve original line numbers exactly.** That's why we instrument *before* transpilation — so `__line__.value = N` matches what the user sees in the editor.

**`@babel/generator`** regenerates code from AST. It produces *equivalent* code, but reformats it — whitespace changes, line breaks move, comments may shift. Line numbers break.

**String concatenation** (what we do now with `result.push()`) works but is fragile. You're building output line-by-line and hoping indices stay aligned. It can't handle multi-line AST nodes that span non-contiguous ranges.

**`magic-string`** manipulates the *original source string* by character offsets. When you do `s.appendLeft(42, '__expr__(1, ')`, it inserts text at character 42 of the original. All other positions automatically adjust. Original formatting, whitespace, and line numbers are preserved. This is exactly what we need.

---

## Phase 1: Expression Detection + `__expr__` Wrapping

### What it replaces

`isExpression()` (lines 35-67), `stripInlineComment()` (lines 14-29), the `__expr__` wrapping block (lines 294-299), `nextNonEmptyIsContinuation()` (lines 156-163), and half of `isChainContinuation()` (lines 169-177).

### Why this is Phase 1

This is where the most bugs live. The current `isExpression()` is a negative-list heuristic — it tries to reject everything that *isn't* an expression by pattern matching prefixes, suffixes, and bracket depth. This is fundamentally backwards. It will always have false negatives (valid expressions rejected) and false positives (non-expressions accepted).

The bugs we've already hit in this function:
- Inline comments swallowing `__expr__` closing paren (the bug that started this migration)
- Regex literals `/pattern/g` rejected as division operators
- Unary `!x`, `~x` rejected as binary operators
- Multi-line expressions where the continuation line isn't detected
- Lines inside ternary chains misidentified as standalone

With an AST, the question "is this an expression statement?" is answered by `node.type === 'ExpressionStatement'`. There is no heuristic. Babel parsed it; it knows.

### Why the current approach keeps breaking

Look at `isExpression()`. It's a series of ~15 negative checks:

```ts
if (STATEMENT_PREFIXES.some((p) => trimmed.startsWith(p))) return false  // reject statements
if (/^[}\])]/.test(trimmed)) return false                                // reject closing brackets
if (/^[.,?:*%|&^=]/.test(trimmed)) return false                         // reject operators
if (trimmed.startsWith('/') && !regexPattern.test(trimmed)) return false // reject division but not regex
if (/^(&&|\|\||\?\?|=>)/.test(trimmed)) return false                    // reject logical operators
if (trimmed.endsWith('{') || trimmed.endsWith('}')) return false         // reject block boundaries
if (trimmed.endsWith(',')) return false                                  // reject multi-line items
if (stripped.includes(';')) return false                                 // reject multi-statement
if (/^console\.\w+\(/.test(trimmed)) return false                       // reject console calls
// ... bracket depth check ...
return true  // anything that survived is "probably an expression"
```

Every time we find a new false positive or false negative, we add another regex. But the space of "things that look like expressions but aren't" is unbounded. The fundamental issue is that **you can't determine if something is an expression by looking at one line of text** — you need to know the full syntactic context, which only a parser provides.

### What the AST approach looks like

```ts
for (const node of ast.program.body) {
  if (node.type === 'ExpressionStatement') {
    const expr = node.expression
    const line = node.loc.start.line
    // Wrap just the expression (not comments, not semicolons)
    s.appendLeft(expr.start, `__expr__(${line}, `)
    s.appendRight(expr.end, `)`)
  }
}
```

The parser already excluded comments from the expression node's range. It already knows `p // comment` has the expression `p` ending before the `//`. It already knows `/test/g` is a regex literal, not division. It already knows `!x` is a unary expression. There is nothing to get wrong.

### Why only top-level `ast.program.body`

We only wrap expressions at the module top level — not inside functions, classes, or blocks. This is the same constraint the regex version enforces with `stack.length === 0`. The reason: `__expr__()` reports inline values to the output pane, and only top-level expressions should produce visible output (inner expressions would flood the UI).

Walking only `ast.program.body` (not recursing into nested blocks) naturally enforces this.

### How `console.log` is excluded

Currently, `isExpression()` has a special case: `if (/^console\.\w+\(/.test(trimmed)) return false`. This exists because `console.log("hi")` is technically an ExpressionStatement, but we don't want to wrap it with `__expr__` (the console capturer already handles output).

With AST: check if the expression is a `CallExpression` whose callee is `console.*`:

```ts
if (node.type === 'ExpressionStatement') {
  const expr = node.expression
  if (expr.type === 'CallExpression' &&
      expr.callee.type === 'MemberExpression' &&
      expr.callee.object.type === 'Identifier' &&
      expr.callee.object.name === 'console') {
    continue // skip — console capturer handles this
  }
  // ... wrap with __expr__
}
```

Precise, no regex, no false matches on variables named `console_logger` or methods like `consolify()`.

---

## Phase 2: `__line__` Insertion + Context Tracking

### What it replaces

`updateStack()` (lines 110-140), `classifyBrace()` (lines 82-100), `isStatementContext()` (lines 147-151), `BraceContext` / `StackEntry` types (lines 76-77), and the `inTemplate` tracker (line 261).

### Why this is Phase 2 (not Phase 1)

The delimiter stack is complex (140 lines) and bug-prone, but it *mostly works*. The bugs it causes (template literal corruption, object-vs-block misclassification) are rarer than the expression detection bugs. Phase 1 gets us the highest ROI.

Also, Phase 2 depends on Phase 1's infrastructure. Once we have the AST and `magic-string` set up from Phase 1, Phase 2 is an incremental addition — we just add more node visitors.

### Why the current approach is fragile

The delimiter stack tries to answer: "Is this line inside a function body (safe to insert `__line__`)? Or inside a class body / object literal / switch (not safe)?"

It does this by tracking every `{`, `}`, `(`, `)`, `[`, `]` while also tracking string literals and template literals to avoid counting brackets inside strings. The `classifyBrace()` function then guesses what a `{` means based on regex:

```ts
if (/=\s*\{$/.test(trimmed)) return 'object'     // const x = {
if (/^return\s*\{$/.test(trimmed)) return 'object' // return {
if (/\(\{$/.test(trimmed)) return 'object'          // fn({
if (/:\s*\{$/.test(trimmed)) return 'object'        // key: {
```

But `{` is ambiguous in JavaScript. Is `{ a: 1 }` an object literal or a block with a label? It depends on context that a line-by-line scanner can't see. The AST parser resolves this ambiguity correctly because it has the full parse tree.

### What the AST approach looks like

Instead of maintaining a stack and asking "is this line safe?", we walk the AST and insert `__line__` before every statement that's inside a safe context:

```ts
function shouldInsertLine(path) {
  // Only insert in block-level contexts
  const parent = path.parent
  if (parent.type === 'Program') return true                    // top level
  if (parent.type === 'BlockStatement') {
    // Check what the block belongs to
    const grandparent = path.parentPath.parent
    if (grandparent.type === 'ClassBody') return false          // class { ... }
    if (grandparent.type === 'SwitchCase') return false         // case: { ... }
    return true                                                  // function/if/for/while body
  }
  return false
}

traverse(ast, {
  Statement(path) {
    if (path.isBlockStatement()) return // don't insert before { itself
    if (shouldInsertLine(path)) {
      const line = path.node.loc.start.line
      s.appendLeft(path.node.start, `__line__.value = ${line};\n`)
    }
  }
})
```

No manual stack. No template literal tracking. No brace classification heuristics. The AST already knows the parent of every node.

### What about `inTemplate`?

The current code tracks whether we're inside a multiline template literal to avoid inserting `__line__` in the middle of a template string:

```js
const html = `
  <div>       // ← don't insert __line__ here
    <p>hi</p> // ← or here
  </div>
`
```

With AST: template literals are a single `TemplateLiteral` node. The walker never enters them — there are no "statements" inside a template string. The problem simply doesn't exist.

---

## Phase 3: Import Transformation

### What it replaces

`transformImports()` (lines 183-246) and its 8 regex patterns for different import shapes.

### Why this is Phase 3 (not earlier)

Import transformation is self-contained and relatively stable. The 8 regex patterns cover the common cases, and we've already fixed re-exports. The remaining gaps (multi-line imports, import assertions) are uncommon in a scratchpad context.

It's lower priority than Phases 1-2 because:
- Bugs here produce clear error messages ("SyntaxError: Unexpected token") rather than silent wrong behavior
- The fix for each missed pattern is a new regex (mechanical, not architectural)
- Users rarely write complex import patterns in a scratchpad

### Why it still should migrate

Despite being stable, the regex approach has a structural limitation: **it processes imports line-by-line.** This means multi-line imports break:

```ts
import {
  useState,
  useEffect,
  useRef
} from "react"
```

The current code only sees `import {` on the first line, doesn't find `from`, and bails. The AST sees the entire `ImportDeclaration` as one node with all specifiers.

### What the AST approach looks like

```ts
traverse(ast, {
  ImportDeclaration(path) {
    const node = path.node
    const source = node.source.value

    if (node.importKind === 'type') {
      s.remove(node.start, node.end)
      return
    }

    // Babel gives us node.specifiers as a typed array:
    // - ImportDefaultSpecifier: import foo from "mod"
    // - ImportNamespaceSpecifier: import * as foo from "mod"
    // - ImportSpecifier: import { foo } from "mod"
    // No regex needed — just check types and build the replacement.
    
    const replacement = buildRequireFromSpecifiers(node.specifiers, source)
    s.overwrite(node.start, node.end, replacement)
  },

  ExportNamedDeclaration(path) {
    if (path.node.source) {
      // export { a } from "mod" — has a source, so it's a re-export
      const replacement = buildRequireFromReexport(path.node)
      s.overwrite(path.node.start, path.node.end, replacement)
    }
  }
})
```

Each specifier type maps to one require() pattern. No regex to match, no edge cases around whitespace or semicolons. The parser already normalized everything.

### Why not let esbuild handle imports?

We instrument before transpilation. If we left imports as-is, esbuild would convert them — but esbuild uses `import()` or keeps `import` statements depending on the format. Since our code runs in `AsyncFunction` (not a module), `import` statements are illegal there. We must convert to `require()` before execution, and doing it during instrumentation means the line numbers stay correct.

---

## Phase 4: Loop Guard Injection

### What it replaces

The regex check at line 311: `if (/^(for|while|do)\b/.test(trimmed) && trimmed.endsWith('{'))`.

### Why this is last

It's the simplest transformation (one line of regex → one AST visitor) and the current approach has the fewest bugs. The only known gap is loops without braces:

```js
while (true) doSomething()  // no {, so regex doesn't match, no guard injected
```

This is uncommon in practice (most infinite loops use braces), and the 5-second timeout still catches it. Low urgency.

### What the AST approach adds

```ts
traverse(ast, {
  'ForStatement|WhileStatement|DoWhileStatement'(path) {
    const body = path.node.body
    if (body.type === 'BlockStatement') {
      s.appendLeft(body.start + 1, '\n__loopGuard__();')
    } else {
      // Single-statement loop body: wrap in block and add guard
      s.appendLeft(body.start, '{ __loopGuard__(); ')
      s.appendRight(body.end, ' }')
    }
  }
})
```

The `else` branch handles `while (true) doSomething()` → `while (true) { __loopGuard__(); doSomething() }`. The current regex can't do this because it doesn't know where the single-statement body starts and ends.

### Why `ForInStatement` and `ForOfStatement` are included

The AST approach naturally handles `for...in` and `for...of` loops too (they're separate node types in Babel). The current regex `^(for|while|do)\b` matches `for` but relies on the `{` check — it accidentally handles `for...in/of` with braces but misses them without braces, same as regular `for`.

---

## Fallback Strategy

If `@babel/parser` fails to produce a usable AST (even with `errorRecovery: true`), fall back to the current regex-based instrumenter.

```ts
export function instrumentCode(code: string): string {
  try {
    return instrumentWithAST(code)
  } catch {
    return instrumentWithRegex(code) // current implementation, renamed
  }
}
```

### When would the AST approach fail?

Rarely. `errorRecovery: true` means Babel returns a partial AST even for code with syntax errors — it fills in `ErrorNode` placeholders and keeps going. The only scenario where it throws entirely is catastrophic parse failure (e.g., binary data passed as code, null bytes). The fallback is insurance, not an expected path.

### Should we keep the fallback forever?

No. After all 4 phases are stable and battle-tested (say, 2-3 release cycles), we should remove the regex fallback. Dead code that's "just in case" becomes a maintenance burden — especially code this complex.

---

## Migration Checklist

- [ ] **Phase 1**: AST-based expression detection + `__expr__` wrapping
  - [ ] Add `@babel/parser` and `magic-string` dependencies
  - [ ] Implement `instrumentWithAST()` for ExpressionStatement wrapping only
  - [ ] All 100 pipeline tests pass
  - [ ] Add new tests for previously-broken edge cases (regex literals, comments, etc.)
  - [ ] Benchmark: confirm no meaningful perf regression (parse + walk should be <10ms for typical scratchpad code)

- [ ] **Phase 2**: AST-based `__line__` insertion
  - [ ] Replace delimiter stack + context tracking with AST parent-node checks
  - [ ] Remove `updateStack()`, `classifyBrace()`, `isStatementContext()`, `inTemplate`
  - [ ] All tests pass

- [ ] **Phase 3**: AST-based import transformation
  - [ ] Replace `transformImports()` regex patterns with `ImportDeclaration` / `ExportNamedDeclaration` visitors
  - [ ] Handle multi-line imports, mixed default+named, import assertions
  - [ ] All tests pass

- [ ] **Phase 4**: AST-based loop guard injection
  - [ ] Handle loops with and without braces
  - [ ] All tests pass

- [ ] **Cleanup**: Remove legacy regex instrumenter (or keep as fallback)
  - [ ] Remove `isExpression()`, `stripInlineComment()`, `isChainContinuation()`, `nextNonEmptyIsContinuation()`, `updateStack()`, `classifyBrace()`, `isStatementContext()`
  - [ ] Update CLAUDE.md to reflect new architecture

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Parser slower than regex | Low | Low | Babel parses ~10MB/s. Scratchpad code is <1KB. Even a 10x slowdown is <1ms. |
| `errorRecovery` produces bad AST for edge cases | Medium | Low | Fallback to regex instrumenter. Monitor for reports. |
| New dependencies add bundle size | Certain | Low | `@babel/parser` is ~500KB. Only runs in main process (Node.js), not bundled into renderer (Chromium). |
| AST positions shift after insertions | None | N/A | `magic-string` handles this automatically — position tracking is its core purpose. |
| Multi-line expressions (ternary across lines) | None | N/A | AST knows the full span of every node — no line-by-line heuristics needed. |
| Output format changes break snapshot-style tests | High | Low | Expected. Tests should assert on transpilation success and `__expr__`/`__line__` presence, not exact output format. Update tests per phase. |

---

## Dependencies to Add

```bash
cd apps/desktop
pnpm add @babel/parser magic-string
pnpm add -D @babel/types  # for type definitions only
```

`@babel/traverse` is NOT needed — we can walk `ast.program.body` directly for top-level nodes (Phase 1) and write a simple recursive walker for nested nodes (Phase 2+). This avoids pulling in Babel's full traversal machinery (~200KB) when a 20-line recursive function suffices.
