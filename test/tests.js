import Bacon from "baconjs"
import R     from "ramda"

import B from "../src/bacon.react.base"

function show(x) {
  switch (typeof x) {
  case "object":
    return JSON.stringify(x)
  default:
    return `${x}`
  }
}

const C = Bacon.constant

function tryGet(s) {
  let result
  s.take(1).onValue(v => result = v)
  return result
}

const testEq = (expr, lambda, expected) => it(
  `${expr} equals ${show(expected)}`, () => {
    const actual = lambda()
    if (!R.equals(actual, expected))
      throw new Error(`Expected: ${show(expected)}, actual: ${show(actual)}`)
  })

describe("B", () => {
  testEq("tryGet(B(3, C(2), [1, {x: C(4)}], {y: [C(5)], z: C(6)}, (...xs) => xs))", () =>
          tryGet(B(3, C(2), [1, {x: C(4)}], {y: [C(5)], z: C(6)}, (...xs) => xs)),
         [3, 2, [1, {x: 4}], {y: [5], z: 6}])
})
