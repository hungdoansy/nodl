/**
 * Parameters of the AsyncFunction the worker runs user code in.
 *
 * The transpiled code is the function body as-is, so a leading 'use strict' stays a
 * directive and top-level declarations behave as at a function's top level (a block
 * would reject valid code like `function f() {} var f`).
 *
 * `console` and `require` are not parameters: the worker (a fresh process per run)
 * installs them as globals. A user's own top-level `const console` / `const require`
 * then shadows them. As parameters, or wrapper `const`s, that's a SyntaxError.
 */
export const WRAPPER_PARAMS = [
  '__expr__', '__line__', '__loopGuard__', '__importMeta__',
  '__require__', // same as require; used by rewritten imports when user code declares its own
] as const
