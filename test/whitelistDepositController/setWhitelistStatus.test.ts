import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'

describe('WhitelistDepositController.setWhitelistStatus', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts when caller is not the portfolio manager', async () => {
    const { whitelistDepositController, other, portfolio } = await loadFixture(flexiblePortfolioFixture)
    await expect(whitelistDepositController.connect(other).setWhitelistStatus(portfolio.address, other.address, true))
      .to.be.revertedWith('WhitelistDepositController: Only portfolio manager can change whitelist status')
  })

  it('sets whitelisted status', async () => {
    const { whitelistDepositController, other, portfolio } = await loadFixture(flexiblePortfolioFixture)
    await whitelistDepositController.setWhitelistStatus(portfolio.address, other.address, true)
    expect(await whitelistDepositController.isWhitelisted(portfolio.address, other.address)).to.eq(true)
    await whitelistDepositController.setWhitelistStatus(portfolio.address, other.address, false)
    expect(await whitelistDepositController.isWhitelisted(portfolio.address, other.address)).to.eq(false)
  })

  it('prevents from setting the same status', async () => {
    const { whitelistDepositController, other, portfolio } = await loadFixture(flexiblePortfolioFixture)
    await whitelistDepositController.setWhitelistStatus(portfolio.address, other.address, true)
    await expect(whitelistDepositController.setWhitelistStatus(portfolio.address, other.address, true))
      .to.be.revertedWith('WhitelistDepositController: Cannot set the same status twice')
  })

  it('emits WhitelistStatusChanged event', async () => {
    const { whitelistDepositController, other, portfolio } = await loadFixture(flexiblePortfolioFixture)
    await expect(whitelistDepositController.setWhitelistStatus(portfolio.address, other.address, true))
      .to.emit(whitelistDepositController, 'WhitelistStatusChanged')
      .withArgs(portfolio.address, other.address, true)
  })
})
