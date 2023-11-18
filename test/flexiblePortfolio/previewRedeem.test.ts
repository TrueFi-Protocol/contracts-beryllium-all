import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC, YEAR } from 'utils'
import { flexiblePortfolioFixture } from 'fixtures'

describe('FlexiblePortfolio.previewRedeem', () => {
  const loadFixture = setupFixtureLoader()

  describe('default withdraw controller', () => {
    it('returns correct amount of assets', async () => {
      const { portfolio, deposit, parseShares } = await loadFixture(flexiblePortfolioFixture)

      const amount = 1
      await deposit(parseUSDC(amount))
      expect(await portfolio.previewRedeem(parseShares(amount))).to.equal(parseUSDC(amount))
    })

    it('returns 0 when 0 is provided', async () => {
      const { portfolio, deposit } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(1))
      expect(await portfolio.previewRedeem(0)).to.equal(0)
    })

    it('returns 0 when total supply is 0', async () => {
      const { portfolio, parseShares } = await loadFixture(flexiblePortfolioFixture)
      expect(await portfolio.previewRedeem(parseShares(1))).to.equal(0)
    })

    it('returns 0 after defaults', async () => {
      const { portfolio, deposit, parseShares, addAcceptFundFixedInterestOnlyLoan, wallet, fixedInterestOnlyLoans, timeTravel } = await loadFixture(flexiblePortfolioFixture)

      const depositAmount = parseUSDC(20)
      const periods = 2
      const periodPayment = depositAmount.div(periods)
      const gracePeriod = DAY / 4

      await deposit(depositAmount)
      await addAcceptFundFixedInterestOnlyLoan(depositAmount, periods, periodPayment, DAY, wallet, gracePeriod)
      await timeTravel(DAY + DAY / 2)
      await portfolio.markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)
      expect(await portfolio.previewRedeem(parseShares(1))).to.equal(0)
    })

    it('accounts for continuous fees', async () => {
      const { portfolio, executeAndTimeTravel, deposit, protocolConfig, setManagerFeeRate, parseShares } = await loadFixture(flexiblePortfolioFixture)
      const amount = 50
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
      const expectedAssets = await portfolio.convertToAssets(parseUSDC(amount))
      expect(await portfolio.previewRedeem(parseShares(amount))).to.equal(expectedAssets)
    })

    it('uses caller portfolio convertToAssets', async () => {
      const { portfolio, parseShares, deposit } = await loadFixture(flexiblePortfolioFixture)
      const amount = 50
      await deposit(parseUSDC(amount))
      expect(await portfolio.previewRedeem(parseShares(amount))).to.equal(parseUSDC(amount))
    })
  })

  describe('non-default withdraw controller is set', () => {
    it('does not revert when Operation not allowed', async () => {
      const { portfolio, parseShares, deposit, mockWithdrawController } = await loadFixture(flexiblePortfolioFixture)
      const amount = 1
      await deposit(parseUSDC(amount))
      await mockWithdrawController({ onRedeem: { assets: parseUSDC(0) } })
      await expect(portfolio.previewRedeem(parseShares(amount))).to.not.be.reverted
    })

    it('returns correct amount of assets', async () => {
      const { portfolio, parseShares, mockWithdrawController } = await loadFixture(flexiblePortfolioFixture)
      await mockWithdrawController({ onRedeem: { assets: parseUSDC(20) } })
      expect(await portfolio.previewRedeem(parseShares(1))).to.equal(parseUSDC(20))
    })
  })
})
