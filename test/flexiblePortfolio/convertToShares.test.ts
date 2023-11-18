import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY, YEAR } from 'utils'

describe('FlexiblePortfolio.convertToShares', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 100

  it('returns 0 when 0 provided', async () => {
    const { portfolio, token, wallet, deposit } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount * 2))
    await deposit(parseUSDC(amount))
    expect(await portfolio.convertToShares(0)).to.equal(0)
  })

  it('returns assets when total shares are zero', async () => {
    const { portfolio, parseShares } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.convertToShares(parseUSDC(amount))).to.equal(parseShares(amount))
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
    expect(await portfolio.convertToShares(parseUSDC(amount))).to.equal(expectedShares)
  })

  it('returns more shares when instrument defaults', async () => {
    const { portfolio, parseShares, borrower, deposit, addAcceptFundFixedInterestOnlyLoan, markInstrumentAsDefaulted, fixedInterestOnlyLoans, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 1, parseUSDC(5), DAY, borrower, DAY)
    await timeTravel(DAY * 2)
    await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)

    const newPortfolioValue = parseUSDC(amount).sub(parseUSDC(20))
    const expectedShares = parseUSDC(amount).mul(parseShares(amount)).div(newPortfolioValue)
    expect(await portfolio.convertToShares(parseUSDC(amount))).to.equal(expectedShares)
  })

  it('reverts when 100% portfolio value loans defaulted', async () => {
    const { portfolio, parseShares, borrower, deposit, addAcceptFundFixedInterestOnlyLoan, markInstrumentAsDefaulted, fixedInterestOnlyLoans, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, parseUSDC(5), DAY, borrower, DAY)
    await timeTravel(DAY * 2)
    await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)
    await expect(portfolio.convertToShares(parseShares(amount)))
      .to.be.revertedWith('FP:Infinite value')
  })

  it('includes protocol fee', async () => {
    const { portfolio, protocolConfig, deposit, executeAndTimeTravel, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.convertToShares(parseUSDC(amount))).to.equal(parseShares(amount).mul(20).div(19))
  })

  it('includes manager fee', async () => {
    const { portfolio, setManagerFeeRate, deposit, executeAndTimeTravel, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.convertToShares(parseUSDC(amount))).to.equal(parseShares(amount).mul(40).div(39))
  })

  it('includes both continuous fee', async () => {
    const { portfolio, protocolConfig, setManagerFeeRate, deposit, executeAndTimeTravel, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.convertToShares(parseUSDC(amount))).to.equal(parseShares(amount).mul(40).div(37))
  })

  it('includes both unpaid continuous fee', async () => {
    const { portfolio, wallet, protocolConfig, setManagerFeeRate, deposit, addAndFundBulletLoan, setNextBlockTimestamp, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await portfolio.convertToShares(parseUSDC(amount))).to.equal(parseShares(amount).mul(40).div(37))
  })
})
