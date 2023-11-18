import { expect } from 'chai'
import { feeStrategyFixture } from 'fixtures/feeStrategyFixture'
import { setupFixtureLoader } from 'test/setup'

describe('FeeStrategy', () => {
  const loadFixture = setupFixtureLoader()

  describe('initialize', () => {
    it('sets fee', async () => {
      const { feeStrategy, managerFeeRate } = await loadFixture(feeStrategyFixture)
      expect(await feeStrategy.managerFeeRate()).to.equal(managerFeeRate)
    })
  })
})
