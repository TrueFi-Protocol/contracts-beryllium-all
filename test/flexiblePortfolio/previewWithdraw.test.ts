import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY, YEAR } from 'utils'

describe('FlexiblePortfolio.previewWithdraw', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 50

  it('does not revert when Operation not allowed', async () => {
    const { portfolio, mockWithdrawController, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await mockWithdrawController({ onWithdraw: { shares: parseShares(0) } })
    await expect(portfolio.previewWithdraw(parseUSDC(amount))).not.to.be.reverted
  })

  it('returns 0 when 0 is provided', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.previewWithdraw(0)).to.equal(0)
  })

  it('returns correct amount', async () => {
    const { portfolio, deposit, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    expect(await portfolio.previewWithdraw(parseUSDC(amount))).to.equal(parseShares(amount))
  })

  it('rounds up', async () => {
    const { portfolio, deposit, addAcceptFundFixedInterestOnlyLoan, borrower, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 3, parseUSDC(10), DAY, borrower, DAY)
    await timeTravel(DAY)

    const sharesRoundedDown = await portfolio.convertToShares(parseUSDC(amount))
    expect(await portfolio.previewWithdraw(parseUSDC(amount))).to.equal(sharesRoundedDown.add(1))
  })

  it('returns less shares when portfolio value accrues', async () => {
    const { portfolio, parseShares, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    const interest = parseUSDC(5)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, interest, DAY, borrower, DAY)
    await timeTravel(DAY)

    expect(await portfolio.previewWithdraw(parseUSDC(amount).add(interest))).to.equal(parseShares(amount))
  })

  it('returns 0 when total supply is 0', async () => {
    const { portfolio, parseShares } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.previewWithdraw(parseShares(1))).to.equal(0)
  })

  it('accounts for continuous fees', async () => {
    const { portfolio, executeAndTimeTravel, deposit, protocolConfig, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    const expectedShares = await portfolio.convertToShares(parseUSDC(amount))
    expect(await portfolio.previewWithdraw(parseUSDC(amount))).to.equal(expectedShares.add(1))
  })

  it('gets overwritten by withdraw controller', async () => {
    const { portfolio, deposit, mockWithdrawController, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    expect(await portfolio.previewWithdraw(parseUSDC(amount))).to.equal(parseShares(amount))
    await mockWithdrawController({ onWithdraw: { shares: parseShares(1) } })
    expect(await portfolio.previewWithdraw(parseUSDC(amount))).to.equal(parseShares(1))
  })
})
