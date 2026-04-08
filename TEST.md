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
| `executor/pipeline.test.ts` | 52 | Full pipeline: instrument → transpile → valid JS |
| `executor/transpiler.test.ts` | 23 | TypeScript transpilation, edge cases |
| `executor/console-capture.test.ts` | 18 | Console method capture, serialization |
| `hooks/useErrorHighlighting.test.ts` | 12 | Error line extraction from stack traces |

**Total: 208 tests across 11 test files**

## User Input Test Cases

### Simple Expressions (9 cases)
1. `42` — number literal
2. `"hello"` — string literal
3. `Math.max(1, 2)` — static method call
4. `foo()` — function call
5. `new Date()` — constructor
6. `x + y` — binary expression
7. `` `hello ${name}` `` — template literal
8. `42;` — trailing semicolon stripped
9. `x > 0 ? "pos" : "neg"` — ternary

### Declarations (5 cases)
10. `const x = 1` / `let y = 2` / `var z = 3`
11. `const { a, b } = { a: 1, b: 2 }` — object destructuring
12. `const [x, y] = [1, 2]` — array destructuring
13. `const x: number = 42` — typed declaration (TS)
14. `const result = await fetch("url")` — async declaration

### Control Flow (7 cases)
15. `if (true) {}` / `for (;;) {}` / `while (true) {}`
16. `throw new Error()`
17. `return 42` / `break` / `continue`
18. `import foo from "bar"` / `export default foo`
19. `if/else if/else` chain
20. `switch` with case/default labels
21. `try/catch/finally`

### TypeScript Features (8 cases)
22. Interface declaration
23. Type alias
24. Generics: `function identity<T>(x: T): T`
25. Enum: `enum Color { Red, Green, Blue }`
26. Type assertions: `as string`
27. `satisfies` keyword
28. Class access modifiers: `public`, `private`, `protected`
29. Type-only imports: `import type { Foo }`

### Multi-line Constructs (16 cases)
30. `setTimeout(() => { ... }, 0)` — callback with closing args
31. Nested setTimeout (3 levels deep)
32. `Promise.resolve().then().then().catch()` — method chains
33. `new Promise((resolve) => { ... }).then(...)` — constructor + chain
34. `foo(\n  arg1,\n  arg2\n)` — multi-line function args
35. `const arr = [\n  1,\n  2\n]` — multi-line array
36. Class with constructor, methods, getters
37. Class with static methods
38. `const config = { ... }` — multi-line object literal
39. Nested object literals: `{ inner: { deep: true } }`
40. Object with method shorthand: `{ greet() {} }`
41. Array of objects: `[{ a: 1 }, { b: 2 }]`
42. Object spread: `{ ...base, b: 2 }`
43. Arrow returning object: `() => ({ a: 1 })`
44. Ternary across lines: `cond\n  ? a\n  : b`
45. Method chaining across lines: `[].map().filter().reduce()`

### Continuation Lines Rejected (11 cases)
46. `.then(() => {})` / `.catch()` / `.map()` — dot chain
47. `}, 0)` / `})` / `])` / `))` — closing brackets
48. `, 0)` / `,arg2` — comma continuation
49. `+ 1` / `&& true` / `|| false` / `?? default` — operators
50. `arg1,` — trailing comma
51. `: value` — ternary continuation

### Real User Code Patterns (15 cases)
52. Event loop demo: sync → microtask → macro ordering
53. Function declaration + call
54. Async function with try/catch
55. Array `.map().filter().reduce()` chains
56. JSON stringify/parse + Math.random + Date
57. Object spread and rest
58. `for...of` and `for...in` loops
59. Immediately invoked function expression (IIFE)
60. `console.table()` with array of objects
61. Map and Set operations
62. RegExp match and test
63. Symbol creation
64. Optional chaining + nullish coalescing
65. Tagged template literals
66. Complex async: nested Promise + setTimeout (user's actual test)

### Transpiler Edge Cases (9 cases)
67. Optional chaining: `obj?.a?.b`
68. Nullish coalescing: `a ?? b`
69. Async/await transpilation
70. Multiple `@__PURE__` annotations stripped
71. `satisfies` keyword stripped
72. Multiline template literal
73. Class access modifiers stripped
74. Empty input
75. Syntax errors report line numbers

## Bugs Found & Fixed

### Cycle 2: Class/Object/Switch Bodies
- **Bug**: `__line__` inserted inside class bodies, object literals, and switch statements
- **Root cause**: All `{` treated as function-body blocks (statement context)
- **Fix**: Tagged delimiter stack — `classifyBrace()` distinguishes `block`, `class`, `object`, `switch`
- **Also fixed**: Ternary continuations (`? val` / `: val` across lines), arrow-returning-object `() => ({})`, nested object literals

## Cycle Log

### Cycle 1 (2025-04-08)
- Added 36 new tests (111 → 147)
- New: `scroll-sync.test.ts`, expanded `ui.test.ts`, `worker-helpers.test.ts`
- Covered: multi-line setTimeout, Promise chains, function bodies, continuation lines

### Cycle 2 (2025-04-08)
- Added 61 new tests (147 → 208)
- New: `pipeline.test.ts` (52 tests) — full instrument → transpile pipeline
- Expanded: `transpiler.test.ts` (+9 tests)
- Found and fixed 5 pipeline bugs: class body, interface body, object literal, switch statement, nested object instrumentation
- Fixed: ternary across lines, arrow returning object
- Covered: 75 unique user input patterns
