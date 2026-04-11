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

## Approach: Single Rewrite

Replace the entire `instrumentCode()` with one AST-based function in a single PR. No phased migration, no coexistence between AST and regex.

**Why not phased:** The phased approach (4 separate PRs) creates coexistence complexity between the AST and regex systems — each phase needs a "how does this interact with the remaining regex code" section, and that's where bugs like multi-line `__line__` regressions come from. The 100 existing pipeline tests are comprehensive enough to validate a clean swap. If something breaks, the new function is ~150 lines with clearly separated concerns — isolating a failure is straightforward.

---

## Stack

```
@babel/parser          →  AST with source positions
  errorRecovery: true     (handles incomplete/invalid code)
  plugins: [typescript]    (handles TS without transpiling first)

@babel/traverse        →  Full AST traversal
                           (reaches function bodies inside expressions)

magic-string           →  Source manipulation by character position
                           (preserves original formatting + line numbers)
```

### Why `@babel/parser`

**esbuild** doesn't expose an AST. **acorn** doesn't parse TypeScript/JSX natively. **ts-morph** is ~50MB, overkill. **swc** has limited `errorRecovery`. **`@babel/parser`** hits the sweet spot: TS + JSX, `errorRecovery: true` for partial ASTs, excellent source positions, ~500KB (main process only).

### Why `magic-string`

Instrumentation must preserve original line numbers exactly. `@babel/generator` regenerates and reformats code — line numbers break. `magic-string` manipulates the original source by character offsets. Formatting preserved.

### Why `@babel/traverse`

`__line__` must be inserted inside ALL block contexts, including function bodies nested inside expressions (arrow callbacks, object methods, IIFEs). The current regex handles these because `classifyBrace()` defaults to `'block'`. `@babel/traverse` handles every nesting pattern correctly with zero edge cases.

### Parser configuration

```ts
const parserConfig = {
  sourceType: 'module',                  // Required: top-level await, import/export
  allowImportExportEverywhere: true,     // Permissive — scratchpad code may be unusual
  allowAwaitOutsideFunction: true,       // Belt-and-suspenders for await
  allowReturnOutsideFunction: true,      // Users may write bare `return`
  errorRecovery: true,                   // Partial AST for incomplete code
  plugins: ['typescript', 'jsx'],        // TS + JSX support
  ranges: true,                          // Character offsets for magic-string
}
```

---

## Dependencies

```bash
cd apps/desktop
pnpm add @babel/parser @babel/traverse magic-string
pnpm add -D @babel/types
```

---

## The New Function: `instrumentWithAST()`

One function, one AST parse, one `magic-string` instance. Four transformations applied in a single traversal:

1. **`__expr__` wrapping** — top-level `ExpressionStatement` nodes
2. **`__line__` insertion** — before every statement in a block context
3. **Import/export transformation** — `import`/`export` → `require()`
4. **Loop guard injection** — `__loopGuard__()` inside loop bodies

### Architecture

```ts
export function instrumentWithAST(code: string): string {
  const ast = parse(code, parserConfig)
  const s = new MagicString(code)

  // Pass 1: top-level expression wrapping (only ast.program.body)
  for (const node of ast.program.body) {
    if (node.type === 'ExpressionStatement') {
      wrapExpression(node, s)
    }
  }

  // Pass 2: traverse for __line__, imports, exports, loop guards
  traverse(ast, {
    Statement(path) {
      insertLineTracking(path, s)
    },
    ImportDeclaration(path) {
      transformImport(path, s)
    },
    ExportNamedDeclaration(path) {
      transformExport(path, s)
    },
    ExportDefaultDeclaration(path) {
      stripExportDefault(path, s)
    },
    'ForStatement|WhileStatement|DoWhileStatement|ForInStatement|ForOfStatement'(path) {
      injectLoopGuard(path, s)
    }
  })

  return s.toString()
}
```

Detailed specs for each transformation follow in [AST_IMPLEMENTATION_SPEC.md](./AST_IMPLEMENTATION_SPEC.md).

---

## Fallback Strategy

If `@babel/parser` fails (even with `errorRecovery: true`), fall back to the regex instrumenter:

```ts
export function instrumentCode(code: string): string {
  try {
    return instrumentWithAST(code)
  } catch {
    return instrumentWithRegex(code) // current implementation, renamed
  }
}
```

Remove fallback after the rewrite is stable (~2-3 release cycles).

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Parser slower than regex | Low | Low | Babel parses ~10MB/s. Scratchpad code is <1KB. |
| `errorRecovery` produces bad AST | Medium | Low | Fallback to regex instrumenter. |
| New deps add bundle size | Certain | Low | ~700KB total. Main process only, not in renderer. |
| Output format differs from regex | High | Low | 100 pipeline tests validate. Tests assert success + presence, not exact format. |
| Regression in edge case not covered by tests | Low | Medium | Fallback to regex. Add test for the case. |

---

## What Gets Deleted

The entire regex instrumenter becomes dead code (or fallback):

- `isExpression()`, `stripInlineComment()`, `STATEMENT_PREFIXES`
- `updateStack()`, `classifyBrace()`, `isStatementContext()`
- `BraceContext`, `StackEntry` types, `inTemplate` tracker
- `isChainContinuation()`, `nextNonEmptyIsContinuation()`
- `transformImports()` and its 8 regex patterns
- The loop guard regex
- The entire line-by-line `for` loop in `instrumentCode()`

---

## Implementation Checklist

- [ ] Add `@babel/parser`, `@babel/traverse`, `magic-string`, `@babel/types` (dev)
- [ ] Create `instrument-ast.ts` with `instrumentWithAST()`
- [ ] Implement expression wrapping (top-level `ExpressionStatement`)
- [ ] Implement `__line__` insertion (`Statement` visitor with parent-type check)
- [ ] Implement import/export transformation (`ImportDeclaration`, `ExportNamedDeclaration`, `ExportDefaultDeclaration`)
- [ ] Implement loop guard injection (all 5 loop types, block + single-statement bodies)
- [ ] Wire up fallback in `instrumentCode()`
- [ ] All 100 pipeline tests pass
- [ ] Add new tests for previously-broken edge cases
- [ ] Benchmark: parse + traverse for 100-line scratchpad (target: <10ms)
- [ ] Update CLAUDE.md to reflect new architecture
