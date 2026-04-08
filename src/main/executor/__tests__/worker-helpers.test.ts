// @vitest-environment node
import { describe, it, expect } from 'vitest'
import { isExpression, instrumentCode } from '../instrument'

describe('isExpression', () => {
  it('identifies standalone numbers', () => {
    expect(isExpression('42')).toBe(true)
  })

  it('identifies standalone strings', () => {
    expect(isExpression('"hello"')).toBe(true)
  })

  it('identifies function calls (non-console)', () => {
    expect(isExpression('Math.max(1, 2)')).toBe(true)
    expect(isExpression('foo()')).toBe(true)
    expect(isExpression('arr.map(x => x + 1)')).toBe(true)
  })

  it('identifies variable references', () => {
    expect(isExpression('b')).toBe(true)
    expect(isExpression('x + y')).toBe(true)
  })

  it('rejects declarations', () => {
    expect(isExpression('const x = 1')).toBe(false)
    expect(isExpression('let y = 2')).toBe(false)
    expect(isExpression('var z = 3')).toBe(false)
  })

  it('rejects control flow', () => {
    expect(isExpression('if (true) {}')).toBe(false)
    expect(isExpression('for (;;) {}')).toBe(false)
    expect(isExpression('while (true) {}')).toBe(false)
    expect(isExpression('throw new Error()')).toBe(false)
  })

  it('rejects function/class declarations', () => {
    expect(isExpression('function foo() {}')).toBe(false)
    expect(isExpression('class Foo {}')).toBe(false)
  })

  it('rejects lines ending with braces', () => {
    expect(isExpression('if (true) {')).toBe(false)
    expect(isExpression('}')).toBe(false)
  })

  it('rejects multi-statement lines', () => {
    expect(isExpression('a(); b()')).toBe(false)
    expect(isExpression('a(); b();')).toBe(false)
  })

  it('rejects console.* calls', () => {
    expect(isExpression('console.log("hi")')).toBe(false)
    expect(isExpression('console.warn("w")')).toBe(false)
    expect(isExpression('console.error("e")')).toBe(false)
  })

  it('rejects comments', () => {
    expect(isExpression('// comment')).toBe(false)
    expect(isExpression('/* block */')).toBe(false)
  })

  it('rejects empty lines', () => {
    expect(isExpression('')).toBe(false)
    expect(isExpression('   ')).toBe(false)
  })

  // --- Multi-line construct parts ---
  it('rejects continuation lines starting with .', () => {
    expect(isExpression('.then(() => {})')).toBe(false)
    expect(isExpression('.catch(e => {})')).toBe(false)
    expect(isExpression('.map(x => x)')).toBe(false)
  })

  it('rejects closing brackets/parens', () => {
    expect(isExpression('}')).toBe(false)
    expect(isExpression('})')).toBe(false)
    expect(isExpression('])')).toBe(false)
    expect(isExpression('))')).toBe(false)
    expect(isExpression('}, 0)')).toBe(false)
  })

  it('rejects lines starting with comma', () => {
    expect(isExpression(', 0)')).toBe(false)
    expect(isExpression(',arg2')).toBe(false)
  })

  it('rejects lines ending with comma', () => {
    expect(isExpression('arg1,')).toBe(false)
    expect(isExpression('"hello",')).toBe(false)
  })

  it('rejects lines starting with operators', () => {
    expect(isExpression('+ 1')).toBe(false)
    expect(isExpression('&& true')).toBe(false)
    expect(isExpression('|| false')).toBe(false)
    expect(isExpression('?? default')).toBe(false)
  })

  it('rejects import/export statements', () => {
    expect(isExpression('import foo from "bar"')).toBe(false)
    expect(isExpression('export default foo')).toBe(false)
  })

  it('rejects return/break/continue', () => {
    expect(isExpression('return 42')).toBe(false)
    expect(isExpression('break')).toBe(false)
    expect(isExpression('continue')).toBe(false)
  })
})

describe('instrumentCode', () => {
  it('wraps standalone expressions with __expr__', () => {
    const result = instrumentCode('42')
    expect(result).toContain('__expr__(1, 42)')
  })

  it('wraps multiple standalone expressions', () => {
    const code = 'const x = 1\n\nx\n\n65'
    const result = instrumentCode(code)
    expect(result).toContain('__expr__(3, x)')
    expect(result).toContain('__expr__(5, 65)')
  })

  it('preserves empty lines (critical for line alignment)', () => {
    const code = 'a\n\n\nb'
    const result = instrumentCode(code)
    const lines = result.split('\n')
    expect(lines).toContain('')
  })

  it('does not wrap declarations', () => {
    const result = instrumentCode('const x = 1')
    expect(result).not.toContain('__expr__')
    expect(result).toContain('const x = 1')
  })

  it('does not wrap console.* calls', () => {
    const result = instrumentCode('console.log("hi")')
    expect(result).not.toContain('__expr__')
    expect(result).toContain('console.log("hi")')
  })

  it('handles simple expressions with correct line numbers', () => {
    const code = `new Date()
new Date()
22
33
44
55
66
77

88
99
100
101
102




new Date()`
    const result = instrumentCode(code)
    expect(result).toContain('__expr__(1, new Date())')
    expect(result).toContain('__expr__(2, new Date())')
    expect(result).toContain('__expr__(3, 22)')
    expect(result).toContain('__expr__(10, 88)')
    expect(result).toContain('__expr__(19, new Date())')
    expect(result).toContain('\n\n')
  })

  it('strips trailing semicolons from expressions', () => {
    const result = instrumentCode('42;')
    expect(result).toContain('__expr__(1, 42)')
    expect(result).not.toContain('42;)')
  })

  it('skips multi-statement lines', () => {
    const result = instrumentCode('a(); b()')
    expect(result).not.toContain('__expr__')
  })

  // --- Multi-line construct handling ---
  it('does not break setTimeout with callback', () => {
    const code = `setTimeout(() => {
  console.log("hi")
}, 0)`
    const result = instrumentCode(code)
    // Should NOT wrap }, 0) as an expression
    expect(result).not.toContain('__expr__')
    // __line__ should be inserted inside the callback body
    expect(result).toContain('__line__.value = 2;')
    // The original code structure should be preserved
    expect(result).toContain('setTimeout(() => {')
    expect(result).toContain('}, 0)')
  })

  it('does not break Promise chains', () => {
    const code = `Promise.resolve()
  .then(() => console.log("a"))
  .then(() => console.log("b"))`
    const result = instrumentCode(code)
    // .then lines should NOT be wrapped or have __line__ inserted before them
    expect(result).not.toContain('__expr__')
    expect(result).toContain('.then(() => console.log("a"))')
    expect(result).toContain('.then(() => console.log("b"))')
  })

  it('tracks __line__ inside function bodies', () => {
    const code = `function main() {
  console.log("1")
  console.log("2")
}`
    const result = instrumentCode(code)
    // Lines inside function body should get __line__ tracking
    expect(result).toContain('__line__.value = 2;')
    expect(result).toContain('__line__.value = 3;')
  })

  it('tracks __line__ inside nested callbacks', () => {
    const code = `setTimeout(() => {
  console.log("a")
  setTimeout(() => {
    console.log("b")
  }, 0)
}, 0)`
    const result = instrumentCode(code)
    expect(result).toContain('__line__.value = 2;')
    expect(result).toContain('__line__.value = 4;')
  })

  it('wraps function call at top level after declaration', () => {
    const code = `function greet(name) {
  return "Hello " + name
}

greet("world")`
    const result = instrumentCode(code)
    expect(result).toContain('__expr__(5, greet("world"))')
  })

  it('does not wrap inside function bodies', () => {
    const code = `function foo() {
  42
  "hello"
}`
    const result = instrumentCode(code)
    // Expressions inside function body should NOT get __expr__ (they're not top-level)
    expect(result).not.toContain('__expr__')
  })

  it('handles nested Promise in setTimeout', () => {
    const code = `function main() {
  new Promise((resolve) => {
    console.log("2")
    resolve(1)
  }).then(() => {
    console.log("3")
  })
}`
    const result = instrumentCode(code)
    expect(result).not.toContain('__expr__')
    // Closing lines should not break syntax
    expect(result).toContain('}).then(() => {')
    expect(result).toContain('})')
  })

  it('does not insert __line__ inside paren expressions', () => {
    const code = `foo(
  arg1,
  arg2
)`
    const result = instrumentCode(code)
    // arg1 and arg2 are inside parens — no __line__ insertion
    expect(result).not.toMatch(/__line__\.value = 2/)
    expect(result).not.toMatch(/__line__\.value = 3/)
  })

  it('does not insert __line__ inside array literals', () => {
    const code = `const arr = [
  1,
  2,
  3
]`
    const result = instrumentCode(code)
    // Items inside [ ] should not get __line__
    expect(result).not.toMatch(/__line__\.value = 2/)
  })

  it('handles class declarations', () => {
    const code = `class Counter {
  count = 0
  increment() { return ++this.count }
}
const c = new Counter()`
    const result = instrumentCode(code)
    // Class body is inside {}, no __line__ leaking into expression context
    expect(result).toContain('__line__.value = 5;')
    expect(result).toContain('const c = new Counter()')
  })

  it('handles async/await at top level', () => {
    const code = `const result = await fetch("url")
result`
    const result = instrumentCode(code)
    expect(result).toContain('__line__.value = 1;')
    expect(result).toContain('__expr__(2, result)')
  })

  it('handles object destructuring', () => {
    const code = 'const { a, b } = obj'
    const result = instrumentCode(code)
    expect(result).not.toContain('__expr__')
    expect(result).toContain('const { a, b } = obj')
  })

  it('handles template literals as expressions', () => {
    const result = instrumentCode('`hello ${name}`')
    expect(result).toContain('__expr__(1, `hello ${name}`)')
  })

  it('handles ternary expressions', () => {
    const result = instrumentCode('x > 0 ? "pos" : "neg"')
    expect(result).toContain('__expr__(1,')
  })
})

describe('instrumentCode — real user inputs', () => {
  it('handles event loop demo code', () => {
    const code = `console.log("start")

setTimeout(() => {
  console.log("timeout fires")
}, 0)

Promise.resolve()
  .then(() => console.log("microtask"))

console.log("end")`
    const result = instrumentCode(code)
    // Should not break — no syntax errors
    expect(result).toContain('console.log("start")')
    expect(result).toContain('setTimeout(() => {')
    expect(result).toContain('console.log("end")')
    // Should not wrap setTimeout or Promise chain as expressions
    expect(result).not.toContain('__expr__')
  })

  it('handles complex function with async patterns', () => {
    const code = `function main() {
  console.log("1")

  new Promise((resolve) => {
    console.log("2")
    resolve(1)
  }).then(() => {
    console.log("3")
  })

  console.log("8")

  setTimeout(() => {
    console.log("9")

    Promise.resolve().then(() => {
      console.log("10")
    })
  }, 0)

  console.log("12")
}

main()`
    const result = instrumentCode(code)
    // main() at top level should be wrapped
    expect(result).toContain('__expr__')
    expect(result).toMatch(/__expr__\(\d+, main\(\)\)/)
    // Inner console.logs should get __line__ tracking
    expect(result).toContain('__line__.value = 2;')
  })

  it('handles TypeScript class with methods', () => {
    const code = `class Counter {
  private count = 0
  increment() { return ++this.count }
  get value() { return this.count }
}

const c = new Counter()
c.increment()
c.increment()
c.value`
    const result = instrumentCode(code)
    // Top-level expressions should be wrapped
    expect(result).toContain('__expr__')
    expect(result).toMatch(/__expr__\(\d+, c\.increment\(\)\)/)
    expect(result).toMatch(/__expr__\(\d+, c\.value\)/)
  })

  it('handles array methods chain', () => {
    const code = `const nums = [1, 2, 3, 4, 5]
nums.map(n => n * 2)
nums.filter(n => n > 3)
nums.reduce((a, b) => a + b, 0)`
    const result = instrumentCode(code)
    expect(result).toContain('__expr__')
    expect(result).toMatch(/__expr__\(\d+, nums\.map/)
    expect(result).toMatch(/__expr__\(\d+, nums\.filter/)
    expect(result).toMatch(/__expr__\(\d+, nums\.reduce/)
  })

  it('handles JSON operations', () => {
    const code = `JSON.stringify({ hello: "world" }, null, 2)
JSON.parse('{"a":1}')
Math.random()
new Date().toISOString()`
    const result = instrumentCode(code)
    expect(result).toMatch(/__expr__\(1, JSON\.stringify/)
    expect(result).toMatch(/__expr__\(2, JSON\.parse/)
    expect(result).toMatch(/__expr__\(3, Math\.random\(\)\)/)
    expect(result).toMatch(/__expr__\(4, new Date\(\)\.toISOString\(\)\)/)
  })
})
