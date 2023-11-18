import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { DAY, YEAR } from 'utils/constants'
import { parseUSDC } from 'utils/parseUSDC'

describe('FlexiblePortfolio.maxDeposit', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when portfolio is paused', async () => {
    const { portfolio, wallet } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.pause()
    expect(await portfolio.maxDeposit(wallet.address)).to.equal(0)
  })

  it('returns 0 when portfolio is closed', async () => {
    const { portfolio, timeTravel, wallet } = await loadFixture(flexiblePortfolioFixture)
    await timeTravel(YEAR + 1)
    expect(await portfolio.maxDeposit(wallet.address)).to.equal(0)
  })

  describe('default deposit controller', () => {
    it('returns maxSize when portfolio is empty', async () => {
      const { portfolio, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(maxSize)
    })

    it('returns 0 when portfolio is full', async () => {
      const { portfolio, deposit, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
      await deposit(maxSize)
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(0)
    })

    it('returns correct amount when space remains in portfolio', async () => {
      const { portfolio, deposit, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
      await deposit(maxSize.div(2))
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(maxSize.div(2))
    })

    it('decreases when portfolio value appreciates', async () => {
      const { portfolio, borrower, token, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
      await token.mint(borrower.address, parseUSDC(11))
      await deposit(parseUSDC(10))
      await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(1), DAY, borrower, 0)
      await repayFixedInterestOnlyLoan(0, parseUSDC(11), borrower)
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(maxSize.sub(parseUSDC(11)))
    })

    it('returns 0 after portfolio value appreciates past maxSize', async () => {
      const { portfolio, borrower, token, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
      await token.mint(borrower.address, parseUSDC(11))
      await deposit(maxSize.sub(1))
      await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(1), DAY, borrower, 0)
      await repayFixedInterestOnlyLoan(0, parseUSDC(11), borrower)
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(0)
    })

    it('includes protocol fee', async () => {
      const { portfolio, wallet, protocolConfig, deposit, executeAndTimeTravel, maxSize } = await loadFixture(flexiblePortfolioFixture)
      await protocolConfig.setProtocolFeeRate(1000)
      await executeAndTimeTravel(deposit(maxSize.div(2)), YEAR / 2)
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(maxSize.div(2).add(maxSize.div(2).div(20)))
    })

    it('includes manager fee', async () => {
      const { portfolio, wallet, setManagerFeeRate, deposit, executeAndTimeTravel, maxSize } = await loadFixture(flexiblePortfolioFixture)
      await setManagerFeeRate(500)
      await executeAndTimeTravel(deposit(maxSize.div(2)), YEAR / 2)
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(maxSize.div(2).add(maxSize.div(2).div(40)))
    })

    it('includes both continuous fees', async () => {
      const { portfolio, wallet, protocolConfig, setManagerFeeRate, deposit, executeAndTimeTravel, maxSize } = await loadFixture(flexiblePortfolioFixture)
      const halfMaxSize = maxSize.div(2)
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      await executeAndTimeTravel(deposit(halfMaxSize), YEAR / 2)
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(halfMaxSize.add(halfMaxSize.mul(3).div(40)))
    })

    it('includes both unpaid continuous fees', async () => {
      const { portfolio, wallet, protocolConfig, setManagerFeeRate, deposit, setNextBlockTimestamp, addAndFundBulletLoan, maxSize } = await loadFixture(flexiblePortfolioFixture)
      const halfMaxSize = maxSize.div(2)
      await deposit(halfMaxSize)
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      const { txTimestamp } = await addAndFundBulletLoan(halfMaxSize, halfMaxSize, DAY, wallet)
      await setNextBlockTimestamp(txTimestamp + YEAR / 2)
      await portfolio.updateAndPayFee()
      expect(await portfolio.maxDeposit(wallet.address)).to.equal(halfMaxSize.add(halfMaxSize.mul(3).div(40)))
    })
  })
})
