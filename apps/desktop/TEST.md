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
| `executor/pipeline.test.ts` | 76 | Full pipeline: instrument → transpile → valid JS |
| `executor/transpiler.test.ts` | 23 | TypeScript transpilation, edge cases |
| `executor/console-capture.test.ts` | 18 | Console method capture, serialization |
| `hooks/useErrorHighlighting.test.ts` | 12 | Error line extraction from stack traces |

**Total: 232 tests across 11 test files**

## User Input Test Cases (100 patterns)

### Simple Expressions (9)
1. `42` — number literal
2. `"hello"` — string literal
3. `Math.max(1, 2)` — static method call
4. `foo()` — function call
5. `new Date()` — constructor
6. `x + y` — binary expression
7. `` `hello ${name}` `` — template literal
8. `42;` — trailing semicolon stripped
9. `x > 0 ? "pos" : "neg"` — ternary

### Declarations (5)
10. `const x = 1` / `let y = 2` / `var z = 3`
11. `const { a, b } = { a: 1, b: 2 }` — object destructuring
12. `const [x, y] = [1, 2]` — array destructuring
13. `const x: number = 42` — typed declaration
14. `const { a: { b } } = obj` — nested destructuring

### Control Flow (8)
15. `if/else if/else` chain
16. `switch` with case/default
17. `for (;;)` / `for...of` / `for...in`
18. `while` / `do...while`
19. `try/catch/finally`
20. `throw new Error()`
21. `return` / `break` / `continue`
22. Labeled statement: `loop: for (...) { break loop }`

### TypeScript Features (13)
23. Interface declaration
24. Type alias / conditional type / mapped type
25. Generics: `function identity<T>(x: T): T`
26. Enum / const enum with string values
27. Type assertions: `as string`
28. `satisfies` keyword
29. Class access modifiers: `public`, `private`, `protected`
30. Type-only imports: `import type { Foo }`
31. Abstract class with abstract methods
32. Type guard: `x is string`
33. Assertion function: `asserts cond`
34. Optional params: `x?: number`
35. `declare module`

### Functions (8)
36. Function declaration + call
37. Arrow functions with types
38. Async function with try/catch
39. Generator function: `function* gen()`
40. Default params: `name = "world"`
41. Rest params: `...nums: number[]`
42. Immediately invoked function (IIFE)
43. `for await...of` in async function

### Classes (4)
44. Class with constructor, methods, getters
45. Class with static methods
46. Abstract class
47. Empty class: `class Foo {}`

### Multi-line Constructs (20)
48. `setTimeout(() => { ... }, 0)` — callback
49. Nested setTimeout (3 levels)
50. `Promise.resolve().then().then().catch()` — chains
51. `new Promise().then()` — constructor + chain
52. Multi-line function args: `foo(\n  a,\n  b\n)`
53. Multi-line array: `[\n  1,\n  2\n]`
54. Multi-line object literal: `{ a: 1, b: 2 }`
55. Nested object literals: `{ inner: { deep: true } }`
56. Object with method shorthand: `{ greet() {} }`
57. Array of objects: `[{ a: 1 }, { b: 2 }]`
58. Object spread: `{ ...base, b: 2 }`
59. Arrow returning object: `() => ({ a: 1 })`
60. Ternary across lines: `cond\n  ? a\n  : b`
61. Method chaining: `[].map().filter().reduce()`
62. Computed property: `{ [key]: value }`
63. `new Date(\n  2024,\n  0,\n  1\n)`
64. Conditional object spread: `{ ...(cond ? {} : {}) }`
65. Object with computed + spread combined
66. Multiline template literal (backtick spanning lines)
67. Tagged template literal

### Continuation Lines Rejected (11)
68. `.then()` / `.catch()` / `.map()` — dot chain
69. `}, 0)` / `})` / `])` / `))` — closing brackets
70. `, 0)` / `,arg2` — comma continuation
71. `+ 1` / `&& true` / `|| false` / `?? default`
72. `arg1,` — trailing comma
73. `: value` — ternary continuation

### Operators & Misc (8)
74. Comma operator: `(1, 2, 3)`
75. Chained assignment: `a = b = c = 42`
76. Logical assignment: `??=` / `||=` / `&&=`
77. Void expression: `void 0`
78. Delete: `delete obj.a`
79. Typeof / instanceof
80. Numeric separator: `1_000_000`
81. Nullish coalescing + optional chaining

### Real User Code Patterns (11)
82. Event loop demo: sync → microtask → macro
83. Complex async: nested Promise + setTimeout (user's actual test)
84. Array `.map().filter().reduce()` chains
85. JSON stringify/parse + Math.random + Date
86. Object spread and rest
87. IIFE returning value
88. `console.table()` with array of objects
89. Map and Set operations
90. RegExp match and test
91. Symbol creation
92. Assignment in condition

### Transpiler Edge Cases (9)
93. Optional chaining transpilation
94. Nullish coalescing transpilation
95. Async/await transpilation
96. Multiple `@__PURE__` stripped
97. `satisfies` stripped
98. Class access modifiers stripped
99. Empty input
100. Syntax error line numbers

## Bugs Found & Fixed

### Cycle 2: Class/Object/Switch Bodies
- `__line__` inserted inside class bodies, object literals, switch statements
- Fix: Tagged delimiter stack — `classifyBrace()` distinguishes block/class/object/switch

### Cycle 3: Abstract Class, Enums, Types, Template Literals
- `abstract class` not recognized as class context
- `enum` bodies got `__line__` inserted
- `type` keyword not in STATEMENT_PREFIXES → type aliases treated as expressions
- Multiline template literals (backtick strings spanning lines) had `__line__` inserted mid-string
- Fix: Added `abstract`, `enum`, `type`, `declare`, `namespace` to prefix/brace detection. Added persistent `inTemplate` tracking across lines.

## Cycle Log

### Cycle 1 (2025-04-08)
- 111 → 147 tests (+36)
- New: `scroll-sync.test.ts`, expanded `ui.test.ts`, `worker-helpers.test.ts`

### Cycle 2 (2025-04-08)
- 147 → 208 tests (+61)
- New: `pipeline.test.ts` (52 tests)
- Found/fixed 5 bugs: class body, interface, object literal, switch, nested object

### Cycle 3 (2025-04-08)
- 208 → 232 tests (+24)
- Expanded: `pipeline.test.ts` (+24), `transpiler.test.ts` (+9)
- Found/fixed 4 bugs: abstract class, enum body, type prefix, multiline template
- **100 documented user input patterns reached**
