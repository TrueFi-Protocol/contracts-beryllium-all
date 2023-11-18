import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.allowInstrument', () => {
  const loadFixture = setupFixtureLoader()

  it('adds to whitelist', async () => {
    const { portfolio, allowInstrument, token } = await loadFixture(flexiblePortfolioFixture)
    await allowInstrument(token.address, true)
    expect(await portfolio.isInstrumentAllowed(token.address)).to.be.true
  })

  it('removes from whitelist', async () => {
    const { portfolio, allowInstrument, token } = await loadFixture(flexiblePortfolioFixture)
    await allowInstrument(token.address, true)
    await allowInstrument(token.address, false)
    expect(await portfolio.isInstrumentAllowed(token.address)).to.be.false
  })

  it('only manager can change', async () => {
    const { portfolio, token, other, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.connect(other).allowInstrument(token.address, true))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, MANAGER_ROLE))
  })

  it('emits event', async () => {
    const { portfolio, allowInstrument, token } = await loadFixture(flexiblePortfolioFixture)
    await allowInstrument(token.address, true)

    await expect(allowInstrument(token.address, true))
      .to.emit(portfolio, 'AllowedInstrumentChanged')
      .withArgs(token.address, true)
  })
})
