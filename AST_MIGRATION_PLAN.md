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

### Concrete before/after examples

Each row shows user input → what the AST instrumenter should produce for the `__expr__` wrapping. The `__line__` insertion still uses the regex approach in Phase 1.

| User code | AST node type | Instrumented output |
|-----------|--------------|---------------------|
| `42` | `ExpressionStatement > NumericLiteral` | `__expr__(1, 42)` |
| `42 // the answer` | `ExpressionStatement > NumericLiteral` | `__expr__(1, 42) // the answer` — comment preserved, outside the wrapping |
| `p` (after `const p = ...`) | `ExpressionStatement > Identifier` | `__expr__(2, p)` |
| `/test/gi` | `ExpressionStatement > RegExpLiteral` | `__expr__(1, /test/gi)` |
| `!someFlag` | `ExpressionStatement > UnaryExpression` | `__expr__(1, !someFlag)` |
| `a ? b : c` | `ExpressionStatement > ConditionalExpression` | `__expr__(1, a ? b : c)` |
| `await fetch(url)` | `ExpressionStatement > AwaitExpression` | `__expr__(1, await fetch(url))` |
| `x = 5` | `ExpressionStatement > AssignmentExpression` | `__expr__(1, x = 5)` — assignment is a valid expression |
| `console.log("hi")` | `ExpressionStatement > CallExpression(console.*)` | `console.log("hi")` — **skipped**, console capturer handles it |
| `const x = 1` | `VariableDeclaration` (not ExpressionStatement) | `const x = 1` — **skipped**, it's a statement |
| `if (true) {}` | `IfStatement` | **skipped** |
| Multi-line ternary: | `ExpressionStatement > ConditionalExpression` | Wrapped as one unit — AST spans the full range |
| `condition` | | `__expr__(1, condition` |
| `  ? valueA` | | `  ? valueA` |
| `  : valueB` | | `  : valueB)` |

The multi-line ternary is the key win. The regex approach sees 3 separate lines and has to guess which are continuations. The AST sees one `ConditionalExpression` node spanning lines 1-3, so `appendLeft(expr.start)` and `appendRight(expr.end)` naturally wrap the entire thing.

### Expression types to handle

Babel's `ExpressionStatement` wraps exactly one `Expression` node. These are all the expression types that can appear at the top level:

**Always wrap:**
- `Identifier` — `x`, `foo`
- `NumericLiteral`, `StringLiteral`, `BooleanLiteral`, `NullLiteral` — `42`, `"hi"`, `true`, `null`
- `RegExpLiteral` — `/test/gi`
- `TemplateLiteral` — `` `hello ${name}` ``
- `ArrayExpression` — `[1, 2, 3]`
- `ObjectExpression` — `({ a: 1 })` (parenthesized at top level)
- `UnaryExpression` — `!x`, `~x`, `typeof x`, `void 0`
- `BinaryExpression` — `a + b`
- `ConditionalExpression` — `a ? b : c`
- `CallExpression` — `foo()`, `fetch(url)` (except `console.*`)
- `NewExpression` — `new Date()`
- `MemberExpression` — `obj.prop`, `arr[0]`
- `ArrowFunctionExpression` — `() => 42` (returns the function itself)
- `FunctionExpression` — `function() {}` (same)
- `AssignmentExpression` — `x = 5`, `x += 1`
- `SequenceExpression` — `(a, b, c)`
- `AwaitExpression` — `await promise`
- `YieldExpression` — `yield value` (inside generators)
- `TaggedTemplateExpression` — `` html`<div>` ``
- `OptionalCallExpression` — `foo?.()`
- `OptionalMemberExpression` — `obj?.prop`

**Skip (special cases):**
- `CallExpression` where callee is `console.*` — handled by console capturer
- `AssignmentExpression` where left side is a destructuring pattern and there's no visible "value" to display — debatable, could wrap anyway

We don't need to enumerate these in code — `node.type === 'ExpressionStatement'` catches all of them. The skip list is just the console check.

### What happens with `errorRecovery` nodes

When `errorRecovery: true` is set and the code has syntax errors, Babel:
1. Inserts the valid nodes it could parse into `ast.program.body`
2. Attaches `errors` array to the AST with parse error details
3. May produce partial nodes with missing ranges

Our strategy: iterate `ast.program.body` and skip any node that has missing positional data (`!node.start || !node.end || !node.loc`). Valid nodes still get wrapped correctly. Invalid regions are left untouched. The transpiler (esbuild) will report the syntax error to the user later in the pipeline.

### Why only top-level `ast.program.body`

We only wrap expressions at the module top level — not inside functions, classes, or blocks. This is the same constraint the regex version enforces with `stack.length === 0`. The reason: `__expr__()` reports inline values to the output pane, and only top-level expressions should produce visible output (inner expressions would flood the UI).

Walking only `ast.program.body` (not recursing into nested blocks) naturally enforces this.

### How `console.log` is excluded

Currently, `isExpression()` has a special case: `if (/^console\.\w+\(/.test(trimmed)) return false`. This exists because `console.log("hi")` is technically an ExpressionStatement, but we don't want to wrap it with `__expr__` (the console capturer already handles output).

With AST: check if the expression is a `CallExpression` whose callee is `console.*`:

```ts
function isConsoleCall(node: t.Expression): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = node.callee
  return (
    callee.type === 'MemberExpression' &&
    callee.object.type === 'Identifier' &&
    callee.object.name === 'console'
  )
}
```

Precise, no regex, no false matches on variables named `console_logger` or methods like `consolify()`.

### How Phase 1 coexists with the regex `__line__` insertion

During Phase 1, only `__expr__` wrapping is AST-based. The `__line__` insertion still uses the old line-by-line loop with the delimiter stack.

The implementation structure:

```ts
export function instrumentCode(code: string): string {
  // Phase 1: AST-based __expr__ wrapping
  let result = wrapExpressionsWithAST(code) // uses @babel/parser + magic-string
  
  // Remaining: regex-based __line__, imports, loop guards (migrated in later phases)
  result = insertLineTrackingAndTransforms(result) // current line-by-line loop, minus __expr__ logic
  
  return result
}
```

The key insight: `wrapExpressionsWithAST()` runs first and modifies the source via `magic-string`. Its output is still valid source code (just with `__expr__()` calls added). The regex-based line loop then runs on that output and adds `__line__` / transforms imports / injects loop guards as before.

This means the line-by-line loop needs one change: remove the `isExpression()` + `__expr__` wrapping block (lines 294-299). Everything else stays.

### Implementation steps

1. Add `@babel/parser` and `magic-string` as dependencies
2. Create `wrapExpressionsWithAST(code: string): string` in a new file `instrument-ast.ts`
   - Parse with `@babel/parser` (`errorRecovery: true`, `plugins: ['typescript', 'jsx']`, `ranges: true`)
   - Iterate `ast.program.body`, find `ExpressionStatement` nodes
   - Skip `console.*` calls
   - Skip nodes with missing positional data (from error recovery)
   - Use `magic-string` to wrap: `s.appendLeft(expr.start, ...)`, `s.appendRight(expr.end, ...)`
   - Return `s.toString()`
3. Modify `instrumentCode()` in `instrument.ts`:
   - Call `wrapExpressionsWithAST(code)` first
   - Remove the `isExpression()` check and `__expr__` wrapping block from the line loop
   - Keep `__line__` insertion, `transformImports()`, loop guard injection
4. Run all 100 pipeline tests — they should pass with no changes (output is functionally equivalent)
5. Add new tests for edge cases that the regex version got wrong:
   - Multi-line ternary wrapped as one expression
   - Complex expressions with inline comments
   - Expressions that look like statements to regex but aren't (e.g., `void 0`, `delete obj.key`)
6. Benchmark: parse + walk time for a 100-line scratchpad

### What gets deleted after Phase 1

- `isExpression()` — replaced by `node.type === 'ExpressionStatement'`
- `stripInlineComment()` — not needed, AST's expression range excludes comments
- `nextNonEmptyIsContinuation()` — not needed for expression detection (still used by `__line__` in Phase 2)
- The `__expr__` wrapping block at lines 294-299

What stays (until Phase 2+):
- `updateStack()`, `classifyBrace()`, `isStatementContext()`, `inTemplate` — still used for `__line__`
- `isChainContinuation()` — still used for `__line__` skip logic
- `transformImports()` — still used for imports
- Loop guard regex — still used for loops

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

### Concrete before/after examples

| User code | Current behavior | AST behavior |
|-----------|-----------------|--------------|
| `const x = 1` (top level) | `__line__.value = 1;\nconst x = 1` | Same — top-level statement, safe to insert |
| `console.log(x)` (top level) | `__line__.value = 1;\nconsole.log(x)` | Same — statement in Program body |
| Inside function body: | `__line__.value = 2;\n  return x` | Same — BlockStatement parent, safe |
| Inside class body: | `  method() {}` — no `__line__` | Same — parent is ClassBody, skip |
| Inside object literal: | `  key: value,` — no `__line__` | Same — parent is ObjectExpression/Property, skip |
| Inside switch: | `  case 1: break` — no `__line__` | Same — parent is SwitchCase, skip |
| Multiline template: | Lines inside `` ` `` pass through | Never visited — TemplateLiteral is one node |
| `` // comment with ` `` then `const x = 1` | **BUG (fixed):** backtick corrupted `inTemplate` | No bug — comments aren't AST nodes to visit |
| `{ a: 1 }` at top level | **Ambiguous:** regex guesses object (due to `:`) | AST knows: `ExpressionStatement > ObjectExpression` or `BlockStatement > LabeledStatement` — correct either way |

### Where `__line__` should be inserted

The rule: insert before any statement that's in a "block-level" context. The AST makes this a parent-type check:

**Insert `__line__` when parent is:**
- `Program` — top level (always safe)
- `BlockStatement` whose grandparent is **NOT** `ClassBody` or `ClassDeclaration`

**Do NOT insert when parent is:**
- `ClassBody` — only class members allowed (`method()`, `property = value`)
- `SwitchCase` — only `case`/`default` labels and their consequent statements
- `ObjectExpression` / `ObjectProperty` — object literal key-value pairs
- `ArrayExpression` — array elements
- Any expression context (function args, ternary branches, etc.)

**Statement types that get `__line__`:**
- `VariableDeclaration` — `const x = 1`
- `ExpressionStatement` — `foo()`, `x = 5` (also gets `__expr__` from Phase 1 if top-level)
- `ReturnStatement` — `return x`
- `ThrowStatement` — `throw new Error()`
- `IfStatement` — `if (cond) { ... }`
- `ForStatement`, `WhileStatement`, `DoWhileStatement` — loops
- `ForInStatement`, `ForOfStatement` — `for...in`, `for...of`
- `TryStatement` — `try { ... } catch { ... }`
- `SwitchStatement` — `switch (x) { ... }`
- `FunctionDeclaration` — `function foo() { ... }`
- `ClassDeclaration` — `class Foo { ... }`
- `ImportDeclaration` — `import x from "y"` (also transformed in Phase 3)
- `ExportNamedDeclaration`, `ExportDefaultDeclaration` — `export ...`

**Statement types that do NOT get `__line__`:**
- `BlockStatement` itself — `{ ... }` is a container, not a trackable statement
- `EmptyStatement` — lone `;`
- `DebuggerStatement` — debatable, but rare

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

### How the AST walker works (without `@babel/traverse`)

We don't need the full `@babel/traverse` package. A simple recursive function suffices because we only care about statements inside blocks:

```ts
function walkStatements(
  nodes: t.Statement[],
  parentType: string,
  s: MagicString
): void {
  for (const node of nodes) {
    // Insert __line__ if in a safe context
    if (parentType === 'Program' || parentType === 'BlockStatement') {
      if (node.loc && node.start != null) {
        s.appendLeft(node.start, `__line__.value = ${node.loc.start.line};\n`)
      }
    }

    // Recurse into child blocks
    if (node.type === 'BlockStatement') {
      walkStatements(node.body, 'BlockStatement', s)
    } else if (node.type === 'IfStatement') {
      if (node.consequent.type === 'BlockStatement') {
        walkStatements(node.consequent.body, 'BlockStatement', s)
      }
      if (node.alternate?.type === 'BlockStatement') {
        walkStatements(node.alternate.body, 'BlockStatement', s)
      }
    } else if (node.type === 'ForStatement' || node.type === 'WhileStatement' || node.type === 'DoWhileStatement' || node.type === 'ForInStatement' || node.type === 'ForOfStatement') {
      if (node.body.type === 'BlockStatement') {
        walkStatements(node.body.body, 'BlockStatement', s)
      }
    } else if (node.type === 'TryStatement') {
      walkStatements(node.block.body, 'BlockStatement', s)
      if (node.handler) walkStatements(node.handler.body.body, 'BlockStatement', s)
      if (node.finalizer) walkStatements(node.finalizer.body, 'BlockStatement', s)
    } else if (node.type === 'FunctionDeclaration') {
      if (node.body) walkStatements(node.body.body, 'BlockStatement', s)
    }
    // ClassDeclaration, SwitchStatement — intentionally NOT recursed into
  }
}

// Entry point:
walkStatements(ast.program.body, 'Program', s)
```

This is ~30 lines. It handles all the nesting that the current 140-line `updateStack()` + `classifyBrace()` + `isStatementContext()` handles, and it's correct by construction because it only recurses into contexts where `__line__` is safe.

### The `ExpressionStatement` interaction with Phase 1

After Phase 1, top-level `ExpressionStatement` nodes are already wrapped with `__expr__()`. Phase 2 adds `__line__` before them. The result for `42 // the answer`:

```
__line__.value = 1;
__expr__(1, 42) // the answer
```

Both phases operate on the same AST in the same pass. The order of insertions via `magic-string` is deterministic: `__line__` is inserted at the statement's start, `__expr__` wraps the inner expression. No conflict.

### Implementation steps

1. Extend the AST function from Phase 1 to also walk statements and insert `__line__`
2. Implement the recursive `walkStatements()` function (~30 lines)
3. Remove from `instrument.ts`:
   - `updateStack()` (lines 110-140)
   - `classifyBrace()` (lines 82-100)
   - `isStatementContext()` (lines 147-151)
   - `BraceContext` / `StackEntry` types (lines 76-77)
   - `inTemplate` tracker
   - `isChainContinuation()` (no longer needed — AST knows statement boundaries)
   - `nextNonEmptyIsContinuation()` (same)
   - The entire line-by-line loop for `__line__` insertion
4. Keep `transformImports()` and loop guard injection (moved into the AST walker or kept as post-processing)
5. Run all tests
6. Add tests for contexts that the regex got wrong:
   - `__line__` inside nested function inside class method (should insert)
   - `__line__` NOT inside object literal that looks like a block
   - Multiline template literal doesn't get `__line__` injected between lines

### What gets deleted after Phase 2

- `updateStack()`, `classifyBrace()`, `isStatementContext()` — replaced by parent-type checks
- `BraceContext`, `StackEntry` types — no longer needed
- `inTemplate` tracker — AST handles template literals as single nodes
- `isChainContinuation()`, `nextNonEmptyIsContinuation()` — no longer needed for `__line__` skip logic
- The entire line-by-line `for` loop in `instrumentCode()` (except the import/loop-guard parts, which move to Phase 3-4)

What stays (until Phase 3-4):
- `transformImports()` — called from the AST walker when visiting `ImportDeclaration`
- Loop guard regex — called from the AST walker when visiting loop nodes

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

### Complete import pattern → require() mapping

Babel gives us typed specifier nodes. The mapping is exhaustive:

**`ImportDeclaration` node:**

| Import syntax | Specifier type(s) | Output |
|--------------|-------------------|--------|
| `import "mod"` | No specifiers (`node.specifiers.length === 0`) | `require("mod")` |
| `import foo from "mod"` | `ImportDefaultSpecifier` | `const foo = (() => { const _m = require("mod"); return _m.default ?? _m; })()` |
| `import * as foo from "mod"` | `ImportNamespaceSpecifier` | `const foo = require("mod")` |
| `import { a, b } from "mod"` | `ImportSpecifier[]` | `const { a, b } = require("mod")` |
| `import { a as x } from "mod"` | `ImportSpecifier` with `imported.name !== local.name` | `const { a: x } = require("mod")` |
| `import foo, { a, b } from "mod"` | `ImportDefaultSpecifier` + `ImportSpecifier[]` | `const foo = (() => { const _m = require("mod"); return _m.default ?? _m; })(); const { a, b } = require("mod")` |
| `import foo, * as ns from "mod"` | `ImportDefaultSpecifier` + `ImportNamespaceSpecifier` | `const foo = (() => { const _m = require("mod"); return _m.default ?? _m; })(); const ns = require("mod")` |
| `import type { Foo } from "mod"` | `node.importKind === 'type'` | `` (stripped — no runtime) |
| `import { type Foo, bar } from "mod"` | `ImportSpecifier` with `spec.importKind === 'type'` for Foo | `const { bar } = require("mod")` — type-only specifiers filtered out |

**`ExportNamedDeclaration` node (with `source`):**

| Export syntax | Output |
|--------------|--------|
| `export { a, b } from "mod"` | `const { a, b } = require("mod")` |
| `export * from "mod"` | `require("mod")` (side-effect only in scratchpad) |
| `export type { Foo } from "mod"` | `` (stripped) |
| `export { type Foo, bar } from "mod"` | `const { bar } = require("mod")` — type-only filtered |

**`ExportDefaultDeclaration` / `ExportNamedDeclaration` (without `source`):**

These are NOT re-exports. They export local declarations. In a scratchpad context, `export default` and `export const` have no meaning (there's no module consumer). Strategy:
- `export default expr` → strip `export default`, keep the expression as-is
- `export const x = 1` → strip `export`, keep `const x = 1`
- `export function foo() {}` → strip `export`, keep `function foo() {}`

This is an improvement over the current code, which doesn't handle these at all (they pass through and fail at runtime).

### Multi-line imports: the key win

The regex approach processes line-by-line, so this breaks:

```ts
import {
  useState,
  useEffect,
  useRef
} from "react"
```

Line 1 sees `import {`, no `from`, bails. Lines 2-4 are treated as unknown code. Line 5 starts with `}`, rejected by `isExpression()`.

The AST sees one `ImportDeclaration` node spanning lines 1-5 with three `ImportSpecifier` nodes. `s.overwrite(node.start, node.end, replacement)` replaces the entire multi-line import with a single-line `const { useState, useEffect, useRef } = require("react")`.

### The `import { type Foo, bar }` edge case

TypeScript allows mixing type-only and value specifiers in one import:

```ts
import { type Foo, bar, type Baz } from "mod"
```

The regex approach can't handle this — it sees `import {` and tries to extract everything between `{` and `}`. It has no concept of `type` annotations on individual specifiers.

The AST gives us `spec.importKind === 'type'` on each `ImportSpecifier`. We filter out type-only specifiers:

```ts
const valueSpecs = node.specifiers.filter(
  s => s.type !== 'ImportSpecifier' || s.importKind !== 'type'
)
// Only generate require() with value specifiers
```

If all specifiers are type-only, the entire import is stripped.

### Implementation steps

1. In the AST walker, add handlers for `ImportDeclaration` and `ExportNamedDeclaration`/`ExportDefaultDeclaration`
2. Implement `buildRequireFromSpecifiers(specifiers, source)`:
   - Group specifiers by type (default, namespace, named)
   - Filter out type-only specifiers
   - Build the `const ... = require(...)` string for each group
3. Implement `buildRequireFromReexport(node)` for `export ... from`
4. Handle `export default`/`export const` without `source` — strip the `export` keyword
5. Remove `transformImports()` from `instrument.ts`
6. Remove the import detection logic from the line loop
7. Run all tests
8. Add new tests:
   - Multi-line import with 10+ specifiers
   - Mixed `import { type Foo, bar }` 
   - `import foo, * as ns from "mod"` (mixed default + namespace)
   - `export default 42`
   - `export const x = 1`
   - `export { type A, b } from "mod"`

### What gets deleted after Phase 3

- `transformImports()` (lines 183-246) — all 8 regex patterns
- The import/export detection in the line loop (`trimmed.startsWith('import ')` etc.)
- `STATEMENT_PREFIXES` entries for `import` and `export` (they're now handled by AST, not prefix matching)

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

### Concrete before/after examples

| User code | Current regex | AST approach |
|-----------|--------------|--------------|
| `for (let i = 0; i < 10; i++) {\n  console.log(i)\n}` | `for (...) {\n__loopGuard__();\n  console.log(i)\n}` | Same — block body, insert after `{` |
| `while (true) doSomething()` | **No guard** — no `{` at end of line | `while (true) { __loopGuard__(); doSomething() }` — wraps single-statement body |
| `for (const x of arr) process(x)` | **No guard** — no `{` | `for (const x of arr) { __loopGuard__(); process(x) }` |
| `do {\n  x++\n} while (x < 10)` | `do {\n__loopGuard__();\n  x++\n} while (x < 10)` | Same |
| `do x++ while (x < 10)` | **No guard** — `do` doesn't end with `{` | `do { __loopGuard__(); x++ } while (x < 10)` |
| Nested: `for (...) {\n  while (true) {\n    ...\n  }\n}` | Both get guards (both end with `{`) | Same — both are loop nodes with block bodies |
| `for (let i of arr) if (i) console.log(i)` | **No guard** — no `{` | Guard inserted — body is an `IfStatement`, wrapped in block |

### All loop node types handled

| Babel node type | Example | Current regex | AST |
|----------------|---------|---------------|-----|
| `ForStatement` | `for (;;) {}` | Handled if `{` at end | Always handled |
| `WhileStatement` | `while (cond) {}` | Handled if `{` at end | Always handled |
| `DoWhileStatement` | `do {} while (cond)` | Handled if `{` at end | Always handled |
| `ForInStatement` | `for (k in obj) {}` | Handled (regex matches `for`) | Always handled |
| `ForOfStatement` | `for (x of arr) {}` | Handled (regex matches `for`) | Always handled |
| `ForOfStatement` (async) | `for await (x of stream) {}` | **Not handled** — `for` doesn't start the line after instrumentation | Always handled |

The `for await` case is interesting. After `__line__` insertion, the line becomes `__line__.value = N;\nfor await (...)`. The regex `^(for|while|do)\b` matches on the original `trimmed`, so it actually works. But it's fragile — it relies on the regex running on `trimmed` before `__line__` is prepended.

### Single-statement body wrapping

The key new capability. When the loop body is a single statement (no `{}`), we wrap it:

```ts
if (body.type === 'BlockStatement') {
  // Insert at start of existing block
  s.appendLeft(body.start + 1, '\n__loopGuard__();')
} else {
  // Wrap single-statement body in a block
  s.appendLeft(body.start, '{ __loopGuard__(); ')
  s.appendRight(body.end, ' }')
}
```

Edge case: what if the single-statement body is itself multi-line?

```js
while (condition)
  if (x)
    doSomething()
```

Babel parses this as `WhileStatement` with body = `IfStatement` (spanning lines 2-3). `body.start` is the start of `if`, `body.end` is the end of `doSomething()`. The wrapping produces:

```js
while (condition)
  { __loopGuard__(); if (x)
    doSomething() }
```

This is syntactically valid. Not pretty, but it works — and scratchpad users won't see the instrumented code.

### Labeled loops

```js
outer: for (let i = 0; i < 10; i++) {
  inner: for (let j = 0; j < 10; j++) {
    if (i === j) continue outer
  }
}
```

Labels are `LabeledStatement` nodes that wrap the loop. The AST walker visits the inner `ForStatement` regardless of the label. The guard is inserted inside the block body, not between the label and the `for`. No special handling needed.

### Implementation steps

1. In the AST walker, add a handler for all 5 loop types
2. For each loop node:
   - If `body.type === 'BlockStatement'`: `s.appendLeft(body.start + 1, '\n__loopGuard__();')`
   - Else: wrap body with `{ __loopGuard__(); ... }`
3. Remove the loop guard regex from `instrumentCode()` (line 311)
4. Run all tests
5. Add new tests:
   - `while (true) doSomething()` — single-statement body gets guard
   - `for (x of arr) process(x)` — for...of without braces
   - `do x++ while (x < 10)` — do...while without braces
   - `for await (x of stream) { ... }` — async iteration
   - Nested loops — both get guards
   - Labeled loops — guard doesn't break label

### What gets deleted after Phase 4

- The loop guard regex at line 311: `if (/^(for|while|do)\b/.test(trimmed) && trimmed.endsWith('{'))`
- This is the last piece of the line-by-line loop. After Phase 4, the entire `for (let i = 0; i < lines.length; i++)` loop in `instrumentCode()` is gone.

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
