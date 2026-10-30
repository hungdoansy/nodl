---
title: Testing the instrument → transpile pipeline against public syntax corpora
date: 2026-10-30
problem_type: developer_experience
module: apps/desktop/src/main/executor
severity: medium
tags: [instrumenter, esbuild, babel, test262, corpus, differential-testing, loop-guard, decorators]
---

## Symptom

Users reported "TypeScript error" output for code that runs fine under `node`. The
hand-written pipeline tests (`pipeline.test.ts`) all passed, because they only cover
syntax someone thought of.

## Approach that found the bugs

Run public syntax corpora through the real pipeline, with oracles that need no
hand-written expected output:

1. **Static check**: skip snippets the oracle says are invalid. For `.ts` the oracle
   is esbuild's `ts` loader on the raw source; for `.js` it is node's parser
   (`new vm.Script`, then `vm.SourceTextModule` for module code). Every snippet that
   passes the oracle must also survive `instrumentCode` → `transpileInstrumented` →
   `new AsyncFunction(...)`, built exactly like `worker.ts` builds it. Its line count
   must also be unchanged. Compiling the AsyncFunction runs nothing.
   - Attribute each failure by re-running without instrumentation. If raw
     `transpile(src)` also fails, it's a loader limit, not an instrumenter bug. If
     raw compile also fails, it's a wrapper limit (`import.meta`, leftover `export`).
   - Separately, record when `instrumentWithAST` throws: those snippets go through
     the fragile regex fallback.
2. **Runtime check**: run test262 `test/language` tests (harness `assert.js` +
   `sta.js` + `includes`; skip `negative`, `module`, `async`, `raw`) twice in a fresh
   `vm` context, inside the worker's AsyncFunction wrapper: once raw-transpiled, once
   instrumented. Both runs use the same wrapper, so any pass/fail difference comes
   from instrumentation alone. About 13.8k tests run in about 2 minutes.
3. **Probes against the real worker**: fork `out/worker/worker.cjs` with
   `serialization: 'advanced'`. Send `{ code, language, timeout }` and compare the
   output with what `node` gives. This is what caught the semantic bugs (loop guard,
   namespace exports) that a compile-only check can't see.

Corpora that worked (shallow sparse clones; pin the commit):
- tc39/test262 `test/language`
- typescript-eslint `packages/ast-spec/src/**/fixtures`, excluding `_error_`
- microsoft/TypeScript `tsc/testdata/tests/cases/conformance` (moved there after the
  Go port; it was `tests/cases/conformance`)
- babel `packages/babel-parser/test/fixtures` (skip any `options.json` containing
  `"throws"`)
- prettier `tests/format/{js,typescript}`
- TheAlgorithms/TypeScript

## Root causes found (fixed in this round)

- The loop guard threw after 1M iterations counted across **all** loops, so finite
  benchmarks failed. It's now time-based and tied to the execution timeout
  (`loop-guard.ts`). The Settings timeout had also never been sent to the runner.
- `target: 'esnext'` passes decorators through and V8 can't run them. Fixed with
  `supported: { decorators: false }`. Babel also needs the `decorators` and
  `decoratorAutoAccessors` plugins; without them it throws and 240+ corpus files
  dropped to the regex fallback.
- `export` was stripped inside `namespace` blocks, leaving members undefined.
  Rewriting is now top-level only (`isModuleLevel`). With `@dec export class`, the
  class node starts at the decorator, so "strip from `export` to the declaration
  start" is an empty range and magic-string throws (`stripExportKeyword`).

## Gotchas

- Any exception inside `instrumentWithAST` silently switches to the regex
  instrumenter. Bugs in our own visitors (e.g. `export * as ns` reading
  `s.local.type` on a namespace specifier) show up as regex-fallback breakage, not
  as crashes. Count the fallbacks.
- Ignore the remaining test262 runtime differences under `statements/with/*`: a
  Proxy `with` scope observes the `__line__` lookup.
- Upstream esbuild limits, not nodl bugs: BigInt object keys, Unicode 16/17
  identifiers, `await` as an identifier.

A second round fixed module syntax: local `export {}`, anonymous `export default`,
`export * as`, `export { default } from`, string module names and `import.meta`. It
also fixed shebang lines and a misplaced loop-guard `}` (`appendLeft`, not
`appendRight`, at a position shared with the next statement's prefix). Babel now
traverses with `noScope: true`. Corpus failures went 802 → 588 → 210. Of the
remaining 210: 97 are esbuild limits, about 60 are test-only syntax (annex B HTML
comments, unshipped proposals), and some are TS conformance files that V8 rejects
anyway (the esbuild oracle is looser than V8).

A third round fixed the rest:
- `console.log` line attribution in `switch` cases and brace-less if/else/loop bodies.
- `a, b` now reports `b`: a top-level comma expression is wrapped as one `__expr__` argument.
- User code can declare `console`/`require`, and `'use strict'` takes effect. The first
  attempt wrapped user code in a block, which fixed both but made 70 corpus snippets fail
  (`function f() {} var f` is a SyntaxError inside a block). The corpus re-run caught it.
  The fix that held: `console`/`require` became worker globals and user code is the
  function body unchanged.

Still open: TS imports that are only used as types, where a same-named `let` collides
once the import becomes `const`.
