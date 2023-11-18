import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { parseUSDC } from 'utils'
import { DAY, YEAR } from 'utils/constants'

describe('FlexiblePortfolio.maxWithdraw', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 100

  it('returns 0 when portfolio is empty', async () => {
    const { portfolio, wallet } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(0)
  })

  it('returns 0 when owner has no shares', async () => {
    const { portfolio, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    expect(await portfolio.maxWithdraw(other.address)).to.equal(0)
  })

  it('returns 0 when portfolio is paused', async () => {
    const { portfolio, deposit, wallet } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await portfolio.pause()
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(0)
  })

  it('returns 0 when not allowed by withdraw controller', async () => {
    const { portfolio, deposit, wallet, mockWithdrawController } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await mockWithdrawController({ withdrawLimit: parseUSDC(0) })
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(0)
  })

  it('limited by withdraw controller', async () => {
    const { portfolio, deposit, wallet, mockWithdrawController } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await mockWithdrawController({ withdrawLimit: parseUSDC(amount / 2) })
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(parseUSDC(amount / 2))
  })

  it('is limited by liquid assets', async () => {
    const { portfolio, wallet, deposit, addAcceptFundFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount / 2), 1, parseUSDC(1), DAY, wallet, DAY)
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(parseUSDC(amount / 2))
  })

  it('returns more with accrued interest', async () => {
    const { portfolio, deposit, wallet, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))

    const interest = parseUSDC(5)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, interest, DAY, wallet, DAY)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(amount).add(interest), wallet)

    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(parseUSDC(amount).add(interest))
  })

  it('includes protocol fee', async () => {
    const { portfolio, wallet, protocolConfig, executeAndTimeTravel, deposit } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(parseUSDC(amount * 0.95))
  })

  it('includes manager fee', async () => {
    const { portfolio, wallet, setManagerFeeRate, executeAndTimeTravel, deposit } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(parseUSDC(amount * 0.975))
  })

  it('includes both continuous fees', async () => {
    const { portfolio, wallet, protocolConfig, setManagerFeeRate, executeAndTimeTravel, deposit } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    expect(await portfolio.maxWithdraw(wallet.address)).to.equal(parseUSDC(amount * 0.925))
  })
})
