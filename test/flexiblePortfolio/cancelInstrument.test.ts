import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.cancelInstrument', () => {
  const loadFixture = setupFixtureLoader()

  it('can only be called by the manager', async () => {
    const { portfolio, other, fixedInterestOnlyLoans, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)

    await expect(portfolio.connect(other).cancelInstrument(fixedInterestOnlyLoans.address, 0))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, MANAGER_ROLE))
  })
})
