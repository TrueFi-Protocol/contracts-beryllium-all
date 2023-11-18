import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { parseUSDC } from 'utils/parseUSDC'
import { flexiblePortfolioFixture } from 'fixtures'

describe('FlexiblePortfolio.totalAssets', () => {
  const amount = 100
  const fixtureLoader = setupFixtureLoader()
  const loadFixture = () => fixtureLoader(flexiblePortfolioFixture)

  it('grows after borrow', async () => {
    const { portfolio, deposit, addAndFundBulletLoan, timeTravelTo, wallet } = await loadFixture()
    await deposit(parseUSDC(amount))
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount * 2), YEAR / 2, wallet)
    await timeTravelTo(txTimestamp + YEAR / 4)
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 1.5))
  })

  it('is not affected by direct transfers', async () => {
    const { portfolio, token, other } = await loadFixture()
    await token.mint(other.address, parseUSDC(amount))
    await token.connect(other).transfer(portfolio.address, parseUSDC(amount))

    expect(await portfolio.virtualTokenBalance()).to.equal(0)
    expect(await portfolio.totalAssets()).to.equal(0)
  })

  it('is decreased by accrued protocol fee', async () => {
    const { portfolio, deposit, protocolConfig, executeAndTimeTravel } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.9))
  })

  it('is decreased by accrued manager fee', async () => {
    const { portfolio, deposit, setManagerFeeRate, executeAndTimeTravel } = await loadFixture()
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.95))
  })

  it('is decreased by both accrued fee', async () => {
    const { portfolio, deposit, setManagerFeeRate, protocolConfig, executeAndTimeTravel } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.85))
  })

  it('is decreased by unpaidProtocolFee', async () => {
    const { portfolio, deposit, wallet, protocolConfig, addAndFundBulletLoan, executeAndTimeTravel, setNextBlockTimestamp } = await loadFixture()
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 10, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR)
    await executeAndTimeTravel(portfolio.updateAndPayFee(), YEAR)
    const protocolFee = (await portfolio.getFees())['protocolFee']

    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount).sub(protocolFee))
  })

  it('is decreased by unpaidManagerFee', async () => {
    const { portfolio, deposit, wallet, setManagerFeeRate, addAndFundBulletLoan, executeAndTimeTravel, setNextBlockTimestamp } = await loadFixture()
    await deposit(parseUSDC(amount))
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 10, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR)
    await executeAndTimeTravel(portfolio.updateAndPayFee(), YEAR)
    const managerFee = (await portfolio.getFees())['managerFee']

    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount).sub(managerFee))
  })

  it('is decreased by both unpaidFee', async () => {
    const { portfolio, deposit, wallet, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, executeAndTimeTravel, setNextBlockTimestamp } = await loadFixture()
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 10, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR)
    await executeAndTimeTravel(portfolio.updateAndPayFee(), YEAR)
    const [protocolFee, managerFee] = await portfolio.getFees()
    const feeSum = protocolFee.add(managerFee)

    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount).sub(feeSum))
  })

  it('is 0 if fee is bigger than totalAssets', async () => {
    const { portfolio, deposit, protocolConfig, executeAndTimeTravel } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR * 10)
    expect(await portfolio.totalAssets()).to.equal(0)
  })
})
