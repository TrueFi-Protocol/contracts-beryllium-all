import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC, YEAR } from 'utils'

describe('FlexiblePortfolio.convertToAssets', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 100

  it('returns zero when zero provided', async () => {
    const { portfolio, wallet, token, deposit } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    expect(await portfolio.convertToAssets(0)).to.equal(0)
  })

  it('returns correct value after deposit', async () => {
    const { portfolio, wallet, token, deposit } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    const sharesAmount = await portfolio.balanceOf(wallet.address)
    expect(await portfolio.convertToAssets(sharesAmount)).to.equal(parseUSDC(amount))
  })

  it('returns larger amount when portfolio value appreciates', async () => {
    const { portfolio, token, borrower, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, timeTravel, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 1, parseUSDC(5), DAY, borrower, DAY)
    await timeTravel(DAY)
    await token.mint(borrower.address, parseUSDC(5))
    await token.connect(borrower).approve(portfolio.address, parseUSDC(25))
    await repayFixedInterestOnlyLoan(0, parseUSDC(25), borrower)

    const newPortfolioValue = parseUSDC(amount).add(parseUSDC(5))
    expect(await portfolio.convertToAssets(parseShares(amount))).to.equal(newPortfolioValue)
  })

  it('returns smaller amount when instrument defaults', async () => {
    const { portfolio, borrower, deposit, addAcceptFundFixedInterestOnlyLoan, markInstrumentAsDefaulted, fixedInterestOnlyLoans, timeTravel, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 1, parseUSDC(5), DAY, borrower, DAY)
    await timeTravel(DAY * 2)
    await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)

    const newPortfolioValue = parseUSDC(amount).sub(parseUSDC(20))
    expect(await portfolio.convertToAssets(parseShares(amount))).to.equal(newPortfolioValue)
  })

  it('returns 0 when 100% portfolio value loans defaulted', async () => {
    const { portfolio, borrower, deposit, addAcceptFundFixedInterestOnlyLoan, markInstrumentAsDefaulted, fixedInterestOnlyLoans, timeTravel, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, parseUSDC(5), DAY, borrower, DAY)
    await timeTravel(DAY * 2)
    await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)
    expect(await portfolio.convertToAssets(parseShares(amount))).to.equal(0)
  })

  it('includes protocol fee', async () => {
    const { portfolio, protocolConfig, executeAndTimeTravel, deposit, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.convertToAssets(parseShares(amount).mul(20).div(19))).to.equal(parseUSDC(amount).sub(1))
  })

  it('includes manager fee', async () => {
    const { portfolio, setManagerFeeRate, executeAndTimeTravel, deposit, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.convertToAssets(parseShares(amount).mul(40).div(39))).to.equal(parseUSDC(amount).sub(1))
  })

  it('includes both continuous fees', async () => {
    const { portfolio, setManagerFeeRate, protocolConfig, executeAndTimeTravel, deposit, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.convertToAssets(parseShares(amount).mul(40).div(37))).to.equal(parseUSDC(amount).sub(1))
  })

  it('includes both unpaid continuous fees', async () => {
    const { portfolio, wallet, setManagerFeeRate, protocolConfig, addAndFundBulletLoan, setNextBlockTimestamp, deposit, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await portfolio.convertToAssets(parseShares(amount).mul(40).div(37))).to.equal(parseUSDC(amount).sub(1))
  })
})
