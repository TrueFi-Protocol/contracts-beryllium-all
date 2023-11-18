import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'

describe('MultiInstrumentValuationStrategy.initializer', () => {
  const loadFixture = setupFixtureLoader()

  it('sets deployer default admin', async () => {
    const { valuationStrategy, DEFAULT_ADMIN_ROLE, wallet } = await loadFixture(flexiblePortfolioFixture)
    expect(await valuationStrategy.hasRole(DEFAULT_ADMIN_ROLE, wallet.address)).to.be.true
  })
})
