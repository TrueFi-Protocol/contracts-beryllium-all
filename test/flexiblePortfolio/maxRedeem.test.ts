import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY, YEAR } from 'utils/constants'

const amount = 100

describe('FlexiblePortfolio.maxRedeem', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when portfolio is empty', async () => {
    const { portfolio, wallet } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.maxRedeem(wallet.address)).to.equal(0)
  })

  it('returns 0 when owner has no shares', async () => {
    const { portfolio, wallet, other, token, deposit } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    expect(await portfolio.maxRedeem(other.address)).to.equal(0)
  })

  it('returns 0 when portfolio is paused', async () => {
    const { portfolio, token, deposit, wallet } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    await portfolio.pause()
    expect(await portfolio.maxRedeem(wallet.address)).to.equal(0)
  })

  it('is limited by withdraw controller', async () => {
    const { portfolio, parseShares, deposit, token, wallet, mockWithdrawController } = await loadFixture(flexiblePortfolioFixture)
    await mockWithdrawController({ redeemLimit: parseShares(5) })
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    expect(await portfolio.maxRedeem(wallet.address)).to.equal(parseShares(5))
  })

  it('is limited by liquid assets', async () => {
    const { portfolio, parseShares, wallet, deposit, token, borrower, addAcceptFundFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount))
    await deposit(parseUSDC(amount))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount).div(2), 1, parseUSDC(10), DAY, borrower, DAY)

    const maxRedeemableShares = await portfolio.maxRedeem(wallet.address)
    expect(maxRedeemableShares).to.equal(parseShares(amount).div(2))
  })

  it('is limited by user\'s shares', async () => {
    const { portfolio, parseShares, wallet, deposit, token, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(amount).mul(2))
    await deposit(parseUSDC(amount))

    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(50), 1, parseUSDC(10), DAY, wallet, DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(60), wallet)

    const maxRedeemableShares = await portfolio.maxRedeem(wallet.address)
    expect(maxRedeemableShares).to.equal(parseShares(100))
    await expect(portfolio.redeem(maxRedeemableShares, wallet.address, wallet.address)).not.to.be.reverted
  })

  it('is not affected by protocol fee', async () => {
    const { portfolio, wallet, protocolConfig, executeAndTimeTravel, mint, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndTimeTravel(mint(parseShares(amount)), YEAR / 2)
    expect(await portfolio.maxRedeem(wallet.address)).to.equal(parseShares(amount))
  })

  it('is not affected by manager fee', async () => {
    const { portfolio, wallet, setManagerFeeRate, executeAndTimeTravel, mint, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(mint(parseShares(amount)), YEAR / 2)
    expect(await portfolio.maxRedeem(wallet.address)).to.equal(parseShares(amount))
  })

  it('is not affected by both continuous fees', async () => {
    const { portfolio, wallet, protocolConfig, setManagerFeeRate, executeAndTimeTravel, mint, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(mint(parseShares(amount)), YEAR / 2)
    expect(await portfolio.maxRedeem(wallet.address)).to.equal(parseShares(amount))
  })
})
