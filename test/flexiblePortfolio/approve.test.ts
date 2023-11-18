import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { parseEth } from 'utils/parseEth'
import { parseUSDC } from 'utils/parseUSDC'
import { flexiblePortfolioFixture } from 'fixtures'

describe('FlexiblePortfolio.approve', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 100

  it('sets allowance when not paused', async () => {
    const { portfolio, wallet, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await portfolio.approve(other.address, parseEth(amount))
    expect(await portfolio.allowance(wallet.address, other.address)).to.equal(parseEth(amount))
  })

  it('reverts when paused', async () => {
    const { portfolio, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await portfolio.pause()
    await expect(portfolio.approve(other.address, parseEth(amount)))
      .to.be.revertedWith('Pausable: paused')
  })
})
