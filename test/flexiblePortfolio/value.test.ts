import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture, bulletLoansValuationStrategyFixture } from 'fixtures'
import { DAY, parseUSDC } from 'utils'

describe('FlexiblePortfolio.totalAssets', () => {
  const loadFixture = setupFixtureLoader()

  it('is not affected by direct transfers', async () => {
    const { portfolio, token, other } = await loadFixture(flexiblePortfolioFixture)
    const amount = parseUSDC(1_000_000)

    await token.mint(other.address, amount)
    await token.connect(other).transfer(portfolio.address, amount)

    expect(await portfolio.virtualTokenBalance()).to.equal(0)
    expect(await portfolio.totalAssets()).to.equal(0)
  })

  describe('returns portfolio balance', () => {
    it('liquid value', async () => {
      const { portfolio, deposit } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(100))

      expect(await portfolio.totalAssets()).to.equal(parseUSDC(100))
    })

    it('bullet loan value', async () => {
      const { portfolio, token, borrower, addAndFundBulletLoan, deposit } = await loadFixture(bulletLoansValuationStrategyFixture)
      const amount = parseUSDC(100)
      await token.mint(borrower.address, amount)
      await deposit(amount)

      await addAndFundBulletLoan(amount, amount.mul(2), DAY, borrower)

      expect(await portfolio.totalAssets()).to.equal(amount)
    })
  })
})
