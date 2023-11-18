import { expect } from 'chai'

export function assertEqualArrays(expected: any[], value: any[]) {
  expect(expected.length).to.equal(value.length)

  for (let i = 0; i < value.length; i++) {
    expect(expected[i]).to.deep.eq(value[i])
  }
}
