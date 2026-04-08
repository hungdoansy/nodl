# nodl — Test Coverage & User Input Testing

## Test Suite Summary

| Test File | Tests | Area |
|-----------|-------|------|
| `store/ui.test.ts` | 10 | UI state: settings, sidebar, output mode |
| `store/tabs.test.ts` | 15 | Tab management: create, close, rename, reorder |
| `store/output.test.ts` | 11 | Output buffering, per-tab isolation, atomic flush |
| `store/settings.test.ts` | 8 | Settings persistence, theme switching, reset |
| `store/packages.test.ts` | 10 | Package install, remove, error handling |
| `store/scroll-sync.test.ts` | 4 | Scroll sync state between editor and output |
| `executor/worker-helpers.test.ts` | 45 | Expression detection, code instrumentation |
| `executor/transpiler.test.ts` | 14 | TypeScript transpilation, error handling |
| `executor/console-capture.test.ts` | 18 | Console method capture, serialization |
| `hooks/useErrorHighlighting.test.ts` | 12 | Error line extraction from stack traces |

**Total: 147 tests across 10 test files**

## User Input Test Cases (Instrumentation)

These inputs are tested via `instrumentCode` to verify the app doesn't break:

### Simple Expressions
1. `42` — number literal
2. `"hello"` — string literal
3. `Math.max(1, 2)` — static method call
4. `foo()` — function call
5. `new Date()` — constructor
6. `x + y` — binary expression
7. `` `hello ${name}` `` — template literal
8. `42;` — trailing semicolon stripped
9. `x > 0 ? "pos" : "neg"` — ternary

### Declarations (should NOT be wrapped)
10. `const x = 1`
11. `let y = 2`
12. `var z = 3`
13. `const { a, b } = obj` — destructuring
14. `const arr = await fetch("url")` — async declaration

### Control Flow (should NOT be wrapped)
15. `if (true) {}`
16. `for (;;) {}`
17. `while (true) {}`
18. `throw new Error()`
19. `return 42`
20. `break`
21. `continue`

### Multi-line Constructs (must not break syntax)
22. `setTimeout(() => { ... }, 0)` — callback with closing args
23. `Promise.resolve().then(...).then(...)` — method chains
24. `new Promise((resolve) => { ... }).then(...)` — constructor + chain
25. `foo(\n  arg1,\n  arg2\n)` — multi-line function args
26. `const arr = [\n  1,\n  2\n]` — multi-line array
27. Nested setTimeout inside setTimeout
28. Promise.resolve().then() inside setTimeout
29. Class with methods and get/set

### Real User Code Patterns
30. Event loop demo: sync → microtask → macro ordering
31. Function declaration + call (`function main() { ... }; main()`)
32. Class with private fields, methods, getters
33. Array method chains: `.map().filter().reduce()`
34. JSON stringify/parse + Math.random + Date
35. Async/await at top level

### Continuation Lines (must be rejected by isExpression)
36. `.then(() => {})` — dot chain
37. `.catch(e => {})` — dot chain
38. `}, 0)` — closing callback
39. `})` — closing callback
40. `])` — closing array in arg
41. `))` — nested close
42. `, 0)` — trailing arg
43. `+ 1` — operator continuation
44. `&& true` — logical continuation
45. `|| false` — logical continuation
46. `?? default` — nullish coalesce continuation

## Cycle Log

### Cycle 1 (2025-04-08)
- Added 36 new tests (111 → 147)
- New test file: `store/scroll-sync.test.ts` (4 tests)
- Expanded `store/ui.test.ts`: sidebar, output mode tests (+6 tests)
- Expanded `worker-helpers.test.ts`: multi-line constructs, real user inputs (+26 tests)
- All 147 tests passing
- Covered: multi-line setTimeout, Promise chains, function bodies, nested callbacks, class declarations, array/object literals, continuation line rejection
