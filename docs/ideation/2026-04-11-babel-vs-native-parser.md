---
title: "Is a Go/Rust parser alternative to @babel/* actually needed?"
date: 2026-04-11
status: complete
focus: instrumentation parser choice (oxc / swc vs. @babel/parser)
survivor_count: 6
---

# Is a Go/Rust parser alternative to @babel/* actually needed?

## Grounding Summary

**Project shape:** Electron desktop scratchpad (nodl). Core pipeline: `instrumentCode()` (317-line regex) → `transpile()` (esbuild) → fork worker → execute. AST migration is planned: replace regex instrumenter with `@babel/parser` + `@babel/traverse` + `magic-string`. Tool selection is already documented in `AST_MIGRATION_PLAN.md` with explicit rejection rationale for acorn (no TS/JSX), swc (no errorRecovery), ts-morph (50MB), esbuild (no AST).

**Context triggering this question:** The user is considering whether to use oxc or swc (Go/Rust-based) instead of Babel, citing past issues with esbuild's platform-specific native binaries.

**Key constraints:**
- Instrumentation runs once per execution on < 1KB user-typed scratchpad code
- Electron main process (no browser bundle concern)
- App is ~700MB total (Electron), parser adds ~500KB
- 248 unit tests + 100 pipeline tests provide a strong harness
- An HTTP API use case is planned but not yet scoped
- The `errorRecovery` requirement was the deciding factor that eliminated swc already

**Past learnings:** No `docs/solutions/` yet. The AST migration plan in `AST_MIGRATION_PLAN.md` and `AST_IMPLEMENTATION_SPEC.md` encode all prior decisions — tool choice debate is resolved there.

---

## Candidate Pool (28 raw → 6 survivors)

### Adversarial filter log

| Eliminated | Reason |
|-----------|--------|
| Source-map-only line tracking | Doesn't capture expression values — `__expr__` still needed. Incomplete solution. |
| V8 coverage API | Doesn't help with `__expr__` value capture. Complex to wire into forked child. Attractive but wrong tool. |
| Replace `__expr__` with variable snapshotting | Can't capture intermediate expression values: `1 + 1`, method chains, literals don't bind names. |
| vm.Script + Proxy-trapped scope | Proxy intercepts property access, not expression evaluation. `42` or `a + b` won't trigger it. |
| Monaco-side instrumentation | Puts AST logic in renderer — doesn't simplify, just moves complexity. Two parsers load instead of one (Monaco TS service + Babel). |
| esbuild onLoad plugin for single-pass | esbuild's onLoad sees source before TS strip, not after. Constraint "instrument before transpile" is already enforced. Plugin doesn't add anything. |
| Cell-based output model | Changes the product interaction model fundamentally. Out of scope for parser choice question. |
| Worker-side instrumentation | Moves complexity without reducing it. Worker restart still needed to pick up changes. |
| Opportunity cost (raw idea) | True but it's a conclusion, not a direction to explore. Folded into survivor #3. |
| oxc-wasm async complexity | Subsumed in survivor #2 (native addon headache). |
| AST shape adapter layer | Subsumed in survivor #1 (errorRecovery specifics are the sharper argument). |
| UI streaming / spinner | Valuable but orthogonal to the parser question. File separately. |

---

## Survivors

### 1. `errorRecovery` is the decisive argument — no Go/Rust parser qualifies today

**What:** `@babel/parser`'s `{ errorRecovery: true }` option produces a usable AST on partially invalid code. Auto-run fires while the user is mid-edit — `const x =` with no RHS, an unclosed function body, a half-typed type annotation. This is not an edge case; it is the dominant input condition for a scratchpad. swc was already rejected for this reason in `AST_MIGRATION_PLAN.md`. oxc is in the same position: its error recovery mode is not yet stable enough for production scratchpad use.

**Why it matters now:** Without errorRecovery, every keystroke during auto-run throws a parse error and instrumentation silently produces nothing. The fallback is either (a) regex — which means maintaining two systems in parallel — or (b) swallowing the error and sending raw unmodified code to the worker, producing no inline output. Either outcome is a regression from the current regex instrumenter.

**Verdict on the question:** This single constraint eliminates oxc and swc today. Speed is irrelevant if the parser can't handle the inputs.

**Boldness:** High (decisive rejection of the premise)

---

### 2. Native addons + Electron packaging = real, felt pain at release time

**What:** oxc and swc ship as Node native addons (`.node` files with platform-specific prebuilts). Electron requires native addons to be rebuilt against Electron's specific Node ABI version using `@electron/rebuild` (formerly `electron-rebuild`). This adds a mandatory rebuild step to `pnpm run pack` and `pnpm run dist` that must run on each target platform. If Electron updates its Node version between releases, the prebuilts may break silently. `@babel/parser` is pure JavaScript — it has no native addon, no ABI concern, no rebuild step.

**Why it matters now:** The project already calls out that the worker must be `.cjs` due to `"type": "module"` complexity. The dev is already managing one packaging edge case. Adding native addon rebuild to the release checklist is a concrete, recurring cost paid every time a new version ships.

**Note:** This concern also applies to esbuild, but esbuild is already in the project as a production dependency. The project has accepted that cost. Adding a second native dependency (oxc/swc) doubles the rebuild surface.

**Boldness:** Medium (concrete operational risk, not theoretical)

---

### 3. The speed improvement is imperceptible — and the bottleneck is elsewhere

**What:** Babel parses < 1KB scratchpad code in ~3–8ms. oxc would do the same in ~0.5ms. The difference is ~5ms. The actual bottleneck in the pipeline is `child_process.fork()` (15–40ms on first call), plus `waitForAsyncDrain()` (up to 5s). The user waits on the fork and the execution — not on the instrumenter. Even the existing regex instrumenter is < 1ms. A 10× speed improvement on a 3ms step saves time the user does not experience.

**Corollary:** The only scenario where parser speed matters is a high-concurrency HTTP API. That use case is planned but not yet built, and when it is built, the right answer is likely a worker thread pool (reusing Babel instances) rather than a parser swap. The HTTP API concern does not justify a parser migration now.

**Verdict on the question:** Performance is not a valid reason to swap parsers. The premise that "Go/Rust = faster = better" breaks down when the step being optimized is not the bottleneck.

**Boldness:** High (breaks the core assumption behind the question)

---

### 4. Parser-behind-interface: preserve optionality at zero cost

**What:** Design the AST instrumentation layer with a thin `parse(code: string): AST` boundary — a one-function abstraction that Babel implements today. If oxc's errorRecovery matures and the HTTP API needs higher throughput with real latency data to back it, swapping the parser is a one-file change. If the interface is not designed now, swapping later requires touching every traversal site.

**Why it matters now:** The execution-engine package extraction (planned in `docs/plans/2026-04-11-002-feat-execution-engine-package-plan.md`) already requires a clean module boundary. Adding a `parse()` abstraction is a natural fit — the extraction forces the boundary anyway. Cost: ~5 lines. Optionality gained: free future switch.

**Direction:** Implement as `src/parser.ts` with `export function parseCode(code: string): ParseResult`. Babel implements it now. oxc implements it later, if warranted.

**Boldness:** Low (small uplift, high optionality)

---

### 5. Pre-bundle Babel as a frozen artifact to eliminate startup cost

**What:** If the concern is Electron main process cold start (module resolution of Babel's transitive deps, not parse time), the fix is to pre-bundle the instrumenter — Babel included — using esbuild at build time, exactly like `worker.cjs`. The main process `require`s a single pre-built `instrumenter.cjs` with zero module resolution overhead at runtime. Babel never resolves its own deps at startup; it's already compiled into one file.

**Why it matters now:** The project already pre-builds the worker this way. The pattern is established. This turns "Babel adds startup cost" from a blocker into a build step already in use. Measure startup time before and after adding Babel to confirm whether this is actually felt — but the solution exists regardless.

**Implementation:** Add `build:instrumenter` alongside `build:worker` in `package.json`. Output: `out/instrumenter/instrumenter.cjs`. Main process requires this bundle.

**Boldness:** Low (established pattern, directly applicable)

---

### 6. Intentional syntax constraint: shrink the problem space regardless of parser choice

**What:** Explicitly declare that inline output is not supported inside class bodies, switch cases, object literals, and other complex contexts — and fail gracefully (no output from those lines, no crash). Remove the tagged delimiter stack and the 15+ heuristics in `isExpression()` that handle these contexts. The instrumenter shrinks from 317 lines to ~80 lines of straightforward node-type checks. This is compatible with Babel, with a hypothetical oxc migration, and even with a future regex fallback.

**Why it matters now:** The AST migration is motivated by correctness in exactly these complex contexts. But if the product explicitly opts out of supporting them — showing a small ⊘ marker for "no inline output here" rather than silently getting it wrong — the migration becomes simpler, the output is honest, and the maintenance burden shrinks permanently. Most scratchpad code is top-level statements anyway.

**Caveat:** This is a product decision, not just a technical one. The UX of "⊘ inside class body" must be designed deliberately to avoid confusing users. But it honestly represents what inline output means — the current regex silently gets it wrong, which is worse.

**Boldness:** High (reframes what the instrumenter is responsible for)

---

## Cross-Cutting Synthesis

**Synthesis A — "Commit to Babel, preserve optionality"** (Survivors 4 + 5 combined)

Pre-bundle Babel as a frozen artifact (5) and wrap the parse call behind a `parseCode()` interface (4). Result: Babel's correctness now, zero startup penalty, one-line swap to oxc later if warranted by real data. Neither idea alone captures both benefits.

**Synthesis B — "Babel + syntax constraint = simpler AST migration"** (Survivors 1 + 6 combined)

The errorRecovery requirement justifies Babel (1). Intentional syntax constraints reduce what the AST migration must handle (6). Together: proceed with Babel, but scope the migration narrowly — only instrument top-level `ExpressionStatement`, `BlockStatement`, and `Program` contexts. Anything deeper gets no inline output. The migration is smaller, the spec is tighter, the tests are more manageable.

---

## Verdict on the Original Question

**No. A Go/Rust parser alternative is not needed — and is actively harmful in this context.**

Three independent reasons eliminate oxc and swc:
1. Neither provides production-quality error recovery, which is load-bearing for auto-run on incomplete code.
2. Native addons in Electron add real packaging complexity at every release.
3. The performance improvement (~5ms on <1KB code) is imperceptible — the fork and execution dominate.

The AST migration plan's tool selection (`@babel/parser`) is correct. Proceed with it. The two ideas worth adding alongside the migration are: (4) a `parseCode()` abstraction for free future optionality, and (5) pre-bundling the instrumenter as a frozen artifact.

---

## Session Log

| Date | Activity |
|------|---------|
| 2026-04-11 | Initial ideation. 3 sub-agents, 28 raw candidates, 6 survivors. |

---

## Next Step

This is an ideation output — it identifies directions, not requirements. If any survivor warrants further development:
- **Survivors 4+5 (Synthesis A):** Ready to fold directly into the AST migration plan as implementation notes. No separate brainstorm needed.
- **Survivor 6 (syntax constraint):** Warrants `/ce:brainstorm` to define what "⊘ no output here" looks like in the UI and which contexts are explicitly excluded.
- **Survivors 1–3:** Are conclusions that reinforce the existing tool selection — no further action needed.
