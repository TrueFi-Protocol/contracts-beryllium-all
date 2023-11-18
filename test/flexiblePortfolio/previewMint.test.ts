import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY, YEAR } from 'utils/constants'

describe('FlexiblePortfolio.previewMint', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 50

  it('returns 0 when 0 shares provided', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.previewMint(0)).to.equal(0)
  })

  it('returns equivalent amount of assets under zero-fee conditions', async () => {
    const { portfolio, parseShares } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.previewMint(parseShares(100))).to.equal(parseUSDC(100))
  })

  it('rounds up when converting from share decimals to asset decimals', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.previewMint(1)).to.equal(1)
  })

  it('returns correct amount when portfolio value appreciates', async () => {
    const { portfolio, parseShares, wallet, token, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(100))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(100), 1, parseUSDC(25), DAY, wallet, DAY)
    await token.mint(wallet.address, parseUSDC(25))
    await repayFixedInterestOnlyLoan(0, parseUSDC(125), wallet)
    expect(await portfolio.previewMint(parseShares(100))).to.equal(parseUSDC(125))
  })

  it('rounds up correctly when portfolio value appreciates', async () => {
    const { portfolio, parseShares, wallet, token, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    const amount = parseUSDC(100)
    await deposit(amount)
    const interest = parseUSDC(49).div(9)
    await addAcceptFundFixedInterestOnlyLoan(amount, 1, interest, DAY, wallet, DAY)
    await token.mint(wallet.address, interest.mul(2))
    await repayFixedInterestOnlyLoan(0, amount.add(interest), wallet)

    const shares = parseShares(49).div(9)
    const assetsRoundedUp = await portfolio.previewMint(shares)
    const assetsRoundedDown = shares.mul(amount.add(interest)).div(parseShares(100))
    expect(assetsRoundedUp.sub(assetsRoundedDown)).to.equal(1)
  })

  it('accounts for continuous fees', async () => {
    const { portfolio, executeAndTimeTravel, deposit, protocolConfig, setManagerFeeRate, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(parseUSDC(amount)), YEAR / 2)
    const expectedAssets = await portfolio.convertToAssets(parseUSDC(amount))
    expect(await portfolio.previewMint(parseShares(amount))).to.equal(expectedAssets)
  })

  it('accounts for unpaid continuous fees', async () => {
    const { portfolio, addAndFundBulletLoan, setNextBlockTimestamp, wallet, deposit, setManagerFeeRate, protocolConfig, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await portfolio.updateAndPayFee()
    const expectedAssets = await portfolio.convertToAssets(parseUSDC(amount))
    expect(await portfolio.previewMint(parseShares(amount))).to.equal(expectedAssets)
  })

  it('accounts for strategy fee', async () => {
    const { portfolio, mockDepositController, parseShares } = await loadFixture(flexiblePortfolioFixture)
    const previewMintFee = 50
    await mockDepositController({ onMint: { assets: parseUSDC(1), fee: parseUSDC(previewMintFee) } })
    expect(await portfolio.previewMint(parseShares(amount))).to.equal(parseUSDC(1 + previewMintFee))
  })

  it('no strategy fee if strategy not set', async () => {
    const { portfolio, parseShares } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.previewMint(parseShares(amount))).to.equal(parseUSDC(amount))
  })

  it('reverts past end date', async () => {
    const { portfolio, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await timeTravel(YEAR + DAY)
    await expect(portfolio.previewMint(parseUSDC(1)))
      .to.be.revertedWith('FP:End date elapsed')
  })
})
