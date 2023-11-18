import { expect } from 'chai'
import { flexiblePortfolioFixture } from 'fixtures'
import { setupFixtureLoader } from 'test/setup'
import { DAY, ONE_HUNDRED_PERCENT, ONE_PERCENT, parseUSDC, YEAR } from 'utils'

describe('FlexiblePortfolio.liquidAssets', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 100

  it('is 0 initially', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.liquidAssets()).to.equal(0)
  })

  it('increases after deposit', async () => {
    const { portfolio, deposit, token, wallet } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    expect(await portfolio.liquidAssets()).to.equal(parseUSDC(amount))
  })

  it('decreases after withdraw', async () => {
    const { portfolio, deposit, wallet, withdraw, token } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    await withdraw(wallet, parseUSDC(amount / 4))
    expect(await portfolio.liquidAssets()).to.equal(parseUSDC(amount * 3 / 4))
  })

  it('decreases after borrow', async () => {
    const { portfolio, deposit, addAcceptFundFixedInterestOnlyLoan, borrower, wallet, token } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount / 4), 1, parseUSDC(1), DAY, borrower, DAY)
    expect(await portfolio.liquidAssets()).to.equal(parseUSDC(amount * 3 / 4))
  })

  it('increases after repay', async () => {
    const { portfolio, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, borrower, wallet, token } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await token.mint(borrower.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    const interest = amount / 4
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount / 4), 1, parseUSDC(interest), DAY, borrower, DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(amount / 4 + interest), borrower)
    expect(await portfolio.liquidAssets()).to.equal(parseUSDC(amount + interest))
  })

  it('is decreased by protocol continuous fee', async () => {
    const { portfolio, deposit, executeAndTimeTravel, protocolConfig, wallet, token } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(ONE_PERCENT)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    const expectedFee = parseUSDC(amount).mul(ONE_PERCENT).div(ONE_HUNDRED_PERCENT)
    expect(await portfolio.liquidAssets()).to.equal(parseUSDC(amount).sub(expectedFee))
  })

  it('is decreased by manager continuous fee', async () => {
    const { portfolio, deposit, executeAndTimeTravel, setManagerFeeRate, wallet, token } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await setManagerFeeRate(ONE_PERCENT)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    const expectedFee = parseUSDC(amount).mul(ONE_PERCENT).div(ONE_HUNDRED_PERCENT)
    expect(await portfolio.liquidAssets()).to.equal(parseUSDC(amount).sub(expectedFee))
  })

  it('is decreased by both continuous fees', async () => {
    const { portfolio, deposit, executeAndTimeTravel, setManagerFeeRate, wallet, token, protocolConfig } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(ONE_PERCENT)
    await setManagerFeeRate(ONE_PERCENT * 2)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    const expectedFee = parseUSDC(amount).mul(ONE_PERCENT * 3).div(ONE_HUNDRED_PERCENT)
    expect(await portfolio.liquidAssets()).to.equal(parseUSDC(amount).sub(expectedFee))
  })

  it('is 0 when fees exceed virtualTokenBalance', async () => {
    const { portfolio, deposit, executeAndTimeTravel, setManagerFeeRate, wallet, token, protocolConfig } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(ONE_PERCENT * 50)
    await setManagerFeeRate(ONE_PERCENT * 50)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    expect(await portfolio.liquidAssets()).to.equal(0)
  })
})
