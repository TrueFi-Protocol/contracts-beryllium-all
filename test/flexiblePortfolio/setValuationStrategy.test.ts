import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.setValuationStrategy', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if caller is not a strategy manager', async () => {
    const { portfolio, other, CONTROLLER_ADMIN_ROLE, fixedInterestOnlyLoansValuationStrategy: newStrategy } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.connect(other).setValuationStrategy(newStrategy.address))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, CONTROLLER_ADMIN_ROLE))
  })

  it('sets new strategy', async () => {
    const { portfolio, setValuationStrategy, fixedInterestOnlyLoansValuationStrategy: newStrategy } = await loadFixture(flexiblePortfolioFixture)
    await setValuationStrategy(newStrategy.address)
    expect(await portfolio.valuationStrategy()).to.equal(newStrategy.address)
  })

  it('prevents from setting the same strategy', async () => {
    const { valuationStrategy, setValuationStrategy } = await loadFixture(flexiblePortfolioFixture)

    await expect(setValuationStrategy(valuationStrategy.address))
      .to.be.revertedWith('FP:Value has to be different')
  })

  it('emits an event', async () => {
    const { portfolio, setValuationStrategy, fixedInterestOnlyLoansValuationStrategy: newStrategy } = await loadFixture(flexiblePortfolioFixture)
    await expect(setValuationStrategy(newStrategy.address))
      .to.emit(portfolio, 'ValuationStrategyChanged')
      .withArgs(newStrategy.address)
  })
})
