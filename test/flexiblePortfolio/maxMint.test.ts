import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC, YEAR } from 'utils'

describe('FlexiblePortfolio.maxMint', () => {
  const loadFixture = setupFixtureLoader()

  it('returns maxSize when portfolio is empty', async () => {
    const { portfolio, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
    const expectedShares = await portfolio.convertToShares(maxSize)
    expect(await portfolio.maxMint(wallet.address)).to.equal(expectedShares)
  })

  it('returns 0 when portfolio is full', async () => {
    const { portfolio, deposit, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
    await deposit(maxSize)
    expect(await portfolio.maxMint(wallet.address)).to.equal(0)
  })

  it('returns 0 when portfolio is paused', async () => {
    const { portfolio, wallet } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.pause()
    expect(await portfolio.maxMint(wallet.address)).to.equal(0)
  })

  it('returns 0 when portfolio is closed', async () => {
    const { portfolio, timeTravel, wallet } = await loadFixture(flexiblePortfolioFixture)
    await timeTravel(YEAR + 1)
    expect(await portfolio.maxMint(wallet.address)).to.equal(0)
  })

  it('returns correct amount when space remains in portfolio', async () => {
    const { portfolio, deposit, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
    await deposit(maxSize.div(2))
    const expectedShares = await portfolio.convertToShares(maxSize.div(2))
    expect(await portfolio.maxMint(wallet.address)).to.equal(expectedShares)
  })

  it('decreases when portfolio value appreciates', async () => {
    const { portfolio, borrower, token, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(11))
    await deposit(parseUSDC(10))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(1), DAY, borrower, 0)
    await repayFixedInterestOnlyLoan(0, parseUSDC(11), borrower)
    const expectedShares = await portfolio.convertToShares(maxSize.sub(parseUSDC(11)))
    expect(await portfolio.maxMint(wallet.address)).to.equal(expectedShares)
  })

  it('returns 0 after portfolio value appreciates past maxSize', async () => {
    const { portfolio, borrower, token, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, wallet, maxSize } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(11))
    await deposit(maxSize.sub(1))
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(1), DAY, borrower, 0)
    await repayFixedInterestOnlyLoan(0, parseUSDC(11), borrower)
    expect(await portfolio.maxMint(wallet.address)).to.equal(0)
  })

  it('is limited by deposit controller', async () => {
    const { portfolio, wallet, mockDepositController, parseShares } = await loadFixture(flexiblePortfolioFixture)
    const mintLimit = parseShares(15)
    await mockDepositController({ mintLimit })
    expect(await portfolio.maxMint(wallet.address)).to.equal(mintLimit)
  })

  it('returns 0 when portfolio is full and strategy is set', async () => {
    const { portfolio, wallet, mockDepositController, parseShares, deposit, maxSize } = await loadFixture(flexiblePortfolioFixture)
    const mintLimit = parseShares(15)
    await deposit(maxSize)
    await mockDepositController({ mintLimit })
    expect(await portfolio.maxMint(wallet.address)).to.equal(0)
  })

  it('includes protocol fee', async () => {
    const { portfolio, wallet, protocolConfig, deposit, executeAndTimeTravel, maxSize } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndTimeTravel(deposit(maxSize.div(2)), YEAR / 2)
    const fee = maxSize.div(2).div(20)
    const expectedShares = await portfolio.convertToShares(maxSize.div(2).add(fee))
    expect(await portfolio.maxMint(wallet.address)).to.equal(expectedShares)
  })

  it('includes manager fee', async () => {
    const { portfolio, wallet, setManagerFeeRate, deposit, executeAndTimeTravel, maxSize } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(maxSize.div(2)), YEAR / 2)
    const fee = maxSize.div(2).div(40)
    const expectedShares = await portfolio.convertToShares(maxSize.div(2).add(fee))
    expect(await portfolio.maxMint(wallet.address)).to.equal(expectedShares)
  })

  it('includes both continuous fee', async () => {
    const { portfolio, wallet, protocolConfig, setManagerFeeRate, deposit, executeAndTimeTravel, maxSize } = await loadFixture(flexiblePortfolioFixture)
    const halfMaxSize = maxSize.div(2)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndTimeTravel(deposit(halfMaxSize), YEAR / 2)
    const fee = halfMaxSize.mul(3).div(40)
    const expectedShares = await portfolio.convertToShares(halfMaxSize.add(fee))
    expect(await portfolio.maxMint(wallet.address)).to.equal(expectedShares)
  })

  it('includes both unpaid continuous fee', async () => {
    const { portfolio, wallet, protocolConfig, setManagerFeeRate, deposit, setNextBlockTimestamp, addAndFundBulletLoan, maxSize } = await loadFixture(flexiblePortfolioFixture)
    const halfMaxSize = maxSize.div(2)
    await deposit(halfMaxSize)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(halfMaxSize, halfMaxSize, DAY, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await portfolio.updateAndPayFee()
    const fee = halfMaxSize.mul(3).div(40)
    const expectedShares = await portfolio.convertToShares(halfMaxSize.add(fee))
    expect(await portfolio.maxMint(wallet.address)).to.equal(expectedShares)
  })
})
