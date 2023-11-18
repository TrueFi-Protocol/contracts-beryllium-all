import { expect } from 'chai'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { setupFixtureLoader } from 'test/setup'

describe('FixedInterestOnlyLoansValuationStrategy.initializer', () => {
  const loadFixture = setupFixtureLoader()

  it('sets fixedInterestOnlyLoansAddress', async () => {
    const { fixedInterestOnlyLoans, fixedInterestOnlyLoansValuationStrategy } = await loadFixture(flexiblePortfolioFixture)

    expect(await fixedInterestOnlyLoansValuationStrategy.fixedInterestOnlyLoansAddress())
      .to.equal(fixedInterestOnlyLoans.address)
  })

  it('sets parentStrategy', async () => {
    const { fixedInterestOnlyLoansValuationStrategy, valuationStrategy } = await loadFixture(flexiblePortfolioFixture)

    expect(await fixedInterestOnlyLoansValuationStrategy.parentStrategy())
      .to.equal(valuationStrategy.address)
  })

  it('sets deployer as default admin', async () => {
    const { fixedInterestOnlyLoansValuationStrategy, DEFAULT_ADMIN_ROLE, wallet } = await loadFixture(flexiblePortfolioFixture)
    expect(await fixedInterestOnlyLoansValuationStrategy.hasRole(DEFAULT_ADMIN_ROLE, wallet.address)).to.be.true
  })
})
