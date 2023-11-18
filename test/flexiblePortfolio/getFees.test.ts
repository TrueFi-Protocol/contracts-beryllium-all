import { expect } from 'chai'
import { flexiblePortfolioFeeFixture } from 'fixtures'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC, YEAR } from 'utils'

describe('FlexiblePortfolio.getFees', () => {
  const protocolFee = 1000 // 10%
  const managerFeeRate = 500 // 5%
  const amount = 50
  const fixtureLoader = setupFixtureLoader()
  const fixtureWithFee = flexiblePortfolioFeeFixture(protocolFee, managerFeeRate)
  const loadFixture = () => fixtureLoader(fixtureWithFee)

  it('is 0 initially', async () => {
    const { portfolio } = await loadFixture()
    const accruedFees = await portfolio.getFees()
    expect(accruedFees['protocolFee']).to.equal(0)
    expect(accruedFees['managerFee']).to.equal(0)
  })

  it('returns correct amount after year', async () => {
    const { portfolio, deposit, executeAndTimeTravel } = await loadFixture()
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR)
    const accruedFees = await portfolio.getFees()
    expect(accruedFees['protocolFee']).to.equal(parseUSDC(amount * 0.1))
    expect(accruedFees['managerFee']).to.equal(parseUSDC(amount * 0.05))
  })

  it('returns correct amount after half a year', async () => {
    const { portfolio, deposit, executeAndTimeTravel } = await loadFixture()
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    const accruedFees = await portfolio.getFees()
    expect(accruedFees['protocolFee']).to.equal(parseUSDC(amount * 0.1 / 2))
    expect(accruedFees['managerFee']).to.equal(parseUSDC(amount * 0.05 / 2))
  })

  it('returns 0 after value drops to 0', async () => {
    const { portfolio, deposit, wallet, executeAndTimeTravel, withdraw } = await loadFixture()
    await deposit(parseUSDC(amount))
    await executeAndTimeTravel(withdraw(wallet, parseUSDC(amount)), YEAR)
    const accruedFees = await portfolio.getFees()
    expect(accruedFees['protocolFee']).to.equal(0)
    expect(accruedFees['managerFee']).to.equal(0)
  })

  it('returns only most recent update block', async () => {
    const { portfolio, deposit, getTxTimestamp, executeAndTimeTravel, setManagerFeeRate } = await loadFixture()
    await setManagerFeeRate(managerFeeRate)
    const txTimestamp = await getTxTimestamp(deposit(parseUSDC(amount)))
    await executeAndTimeTravel(deposit(parseUSDC(amount), { timestamp: txTimestamp + YEAR / 2 }), YEAR)
    const accruedFees = await portfolio.getFees()
    expect(accruedFees['protocolFee']).to.equal(parseUSDC(amount + amount * 0.925).div(10))
    expect(accruedFees['managerFee']).to.equal(parseUSDC(amount + amount * 0.925).div(20))
  })

  it('accrues both equally past totalAssets', async () => {
    const { portfolio, deposit, executeAndTimeTravel } = await loadFixture()
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR * 8)
    const accruedFees = await portfolio.getFees()
    expect(accruedFees['protocolFee']).to.equal(parseUSDC(amount * 0.8))
    expect(accruedFees['managerFee']).to.equal(parseUSDC(amount * 0.4))
  })

  it('allows both fees to exceed totalAssets', async () => {
    const { portfolio, deposit, executeAndTimeTravel } = await loadFixture()
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR * 20)
    const accruedFees = await portfolio.getFees()
    expect(accruedFees['protocolFee']).to.equal(parseUSDC(amount * 2))
    expect(accruedFees['managerFee']).to.equal(parseUSDC(amount))
  })
})
