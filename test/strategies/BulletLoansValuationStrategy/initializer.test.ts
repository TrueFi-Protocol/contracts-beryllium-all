import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { bulletLoansValuationStrategyFixture } from 'fixtures'

describe('BulletLoansValuationStrategy.initializer', () => {
  const loadFixture = setupFixtureLoader()

  it('sets bulletLoans', async () => {
    const { bulletLoans, valuationStrategy } = await loadFixture(bulletLoansValuationStrategyFixture)

    expect(await valuationStrategy.bulletLoansAddress()).to.equal(bulletLoans.address)
  })

  it('sets parentStrategy', async () => {
    const { valuationStrategy, parentStrategy } = await loadFixture(bulletLoansValuationStrategyFixture)

    expect(await valuationStrategy.parentStrategy()).to.equal(parentStrategy.address)
  })

  it('sets deployer as default admin', async () => {
    const { valuationStrategy, DEFAULT_ADMIN_ROLE, wallet } = await loadFixture(bulletLoansValuationStrategyFixture)
    expect(await valuationStrategy.hasRole(DEFAULT_ADMIN_ROLE, wallet.address)).to.be.true
  })
})
