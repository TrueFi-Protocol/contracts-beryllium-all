import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY, YEAR } from 'utils'

describe('FlexiblePortfolio.previewDeposit', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 100

  describe('default deposit controller', () => {
    it('returns 0 when 0 provided', async () => {
      const { portfolio, token, wallet, deposit } = await loadFixture(flexiblePortfolioFixture)
      await token.mint(wallet.address, parseUSDC(amount * 2))
      await deposit(parseUSDC(amount))
      expect(await portfolio.previewDeposit(0)).to.equal(0)
    })

    it('returns assets when total shares are zero', async () => {
      const { portfolio, parseShares } = await loadFixture(flexiblePortfolioFixture)
      expect(await portfolio.previewDeposit(parseUSDC(amount))).to.equal(parseShares(amount))
    })

    it('returns less shares when portfolio value appreciates', async () => {
      const { portfolio, parseShares, token, borrower, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, timeTravel } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 1, parseUSDC(5), DAY, borrower, DAY)
      await timeTravel(DAY)
      await token.mint(borrower.address, parseUSDC(5))
      await token.connect(borrower).approve(portfolio.address, parseUSDC(25))
      await repayFixedInterestOnlyLoan(0, parseUSDC(25), borrower)

      const newPortfolioValue = parseUSDC(amount).add(parseUSDC(5))
      const expectedShares = parseUSDC(amount).mul(parseShares(amount)).div(newPortfolioValue)
      expect(await portfolio.previewDeposit(parseUSDC(amount))).to.equal(expectedShares)
    })

    it('returns more shares when instrument defaults', async () => {
      const { portfolio, parseShares, borrower, deposit, addAcceptFundFixedInterestOnlyLoan, markInstrumentAsDefaulted, fixedInterestOnlyLoans, timeTravel } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 1, parseUSDC(5), DAY, borrower, DAY)
      await timeTravel(DAY * 2)
      await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)

      const newPortfolioValue = parseUSDC(amount).sub(parseUSDC(20))
      const expectedShares = parseUSDC(amount).mul(parseShares(amount)).div(newPortfolioValue)
      expect(await portfolio.previewDeposit(parseUSDC(amount))).to.equal(expectedShares)
    })

    it('reverts when 100% portfolio value loans defaulted', async () => {
      const { portfolio, borrower, parseShares, deposit, addAcceptFundFixedInterestOnlyLoan, markInstrumentAsDefaulted, fixedInterestOnlyLoans, timeTravel } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, parseUSDC(5), DAY, borrower, DAY)
      await timeTravel(DAY * 2)
      await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)
      await expect(portfolio.previewDeposit(parseShares(amount)))
        .to.be.revertedWith('FP:Infinite value')
    })

    it('reverts when portfolio is closed', async () => {
      const { portfolio, timeTravel, portfolioDuration } = await loadFixture(flexiblePortfolioFixture)
      await timeTravel(portfolioDuration * 2)
      await expect(portfolio.previewDeposit(parseUSDC(amount))).to.be.revertedWith('FP:End date elapsed')
    })

    it('returns the same amount of shares as deposit', async () => {
      const { portfolio, wallet, token, deposit } = await loadFixture(flexiblePortfolioFixture)
      await token.mint(wallet.address, parseUSDC(amount * 2))
      const previewDepositReturn = await portfolio.previewDeposit(parseUSDC(amount))
      await deposit(parseUSDC(amount))
      expect(await portfolio.balanceOf(wallet.address)).to.equal(previewDepositReturn)
    })

    it('accounts for continuous fees', async () => {
      const { portfolio, executeAndTimeTravel, deposit, protocolConfig, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
      const expectedShares = await portfolio.convertToShares(parseUSDC(amount))
      expect(await portfolio.previewDeposit(parseUSDC(amount))).to.equal(expectedShares)
    })

    it('accounts for continuous unpaid fees', async () => {
      const { portfolio, addAndFundBulletLoan, setNextBlockTimestamp, deposit, protocolConfig, wallet, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
      await setNextBlockTimestamp(txTimestamp + YEAR / 2)
      await portfolio.updateAndPayFee()
      const expectedShares = await portfolio.convertToShares(parseUSDC(amount))
      expect(await portfolio.previewDeposit(parseUSDC(amount))).to.equal(expectedShares)
    })
  })

  describe('non-default deposit controller is set', () => {
    it('returns correct amount of shares', async () => {
      const { portfolio, parseShares, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
      await mockDepositController({ onDeposit: { shares: parseShares(20) } })
      expect(await portfolio.previewDeposit(parseUSDC(amount))).to.equal(parseShares(20))
    })
  })
})
