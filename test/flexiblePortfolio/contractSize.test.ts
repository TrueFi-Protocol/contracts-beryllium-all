import { expect } from 'chai'

import { FlexiblePortfolio__factory } from 'contracts'

describe('FlexiblePortfolio size', () => {
  const maxSize = 24576
  const size = FlexiblePortfolio__factory.bytecode.length / 2

  before(() => {
    console.log('      size:', size)
  })

  it(`is less than ${maxSize} B`, () => {
    expect(size).to.be.lessThan(maxSize)
  })
})
