import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { DAY, parseUSDC } from 'utils'
import { setupFixtureLoader } from 'test/setup'
import { assertEqualArrays } from 'utils/assertEqualArrays'

describe('FixedInterestOnlyLoansValuationStrategy.onInstrumentUpdated', () => {
  const loadFixture = setupFixtureLoader()
  const amount = parseUSDC(100)

  it('reverts if paused', async () => {
    const { deposit, fixedInterestOnlyLoans, fixedInterestOnlyLoansValuationStrategy, portfolio, borrower, addFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(amount)
    await addFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(1), 30 * DAY, borrower, DAY)
    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)
    await portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0)
    await fixedInterestOnlyLoansValuationStrategy.pause()

    await expect(portfolio.connect(borrower).repay(fixedInterestOnlyLoans.address, 0, parseUSDC(11)))
      .to.be.revertedWith('Pausable: paused')
  })

  it('reverts if caller is not portfolio or parent strategy', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, deposit, fixedInterestOnlyLoansValuationStrategy, borrower, fixedInterestOnlyLoans, other, portfolio } = await loadFixture(flexiblePortfolioFixture)

    await deposit(amount)
    await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(10), DAY, borrower, DAY)

    await expect(fixedInterestOnlyLoansValuationStrategy.connect(other).onInstrumentUpdated(portfolio.address, fixedInterestOnlyLoans.address, 0))
      .to.be.revertedWith('FixedInterestOnlyLoansValuationStrategy: Only portfolio or parent strategy')
  })

  it('reverts if it is called with an unknown instrument', async () => {
    const { fixedInterestOnlyLoansValuationStrategy, other } = await loadFixture(flexiblePortfolioFixture)

    await expect(fixedInterestOnlyLoansValuationStrategy.connect(other).onInstrumentUpdated(other.address, other.address, 0))
      .to.be.revertedWith('FixedInterestOnlyLoansValuationStrategy: Unexpected instrument')
  })

  it('can be called directly by portfolio', async () => {
    const { token, repayFixedInterestOnlyLoan, fixedInterestOnlyLoansValuationStrategy, borrower, portfolio, addAcceptFundFixedInterestOnlyLoan, deposit } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.setValuationStrategy(fixedInterestOnlyLoansValuationStrategy.address)

    await deposit(amount)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(10), DAY, borrower, DAY)
    await token.mint(borrower.address, parseUSDC(10))
    await repayFixedInterestOnlyLoan(0, parseUSDC(20), borrower)

    expect(await fixedInterestOnlyLoansValuationStrategy.activeLoans(portfolio.address))
      .to.deep.equal([])
  })

  it('removes instrument id from loans array', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, deposit, borrower, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, token } = await loadFixture(flexiblePortfolioFixture)

    await deposit(amount)
    await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(10), DAY, borrower, DAY)

    assertEqualArrays(await fixedInterestOnlyLoansValuationStrategy.activeLoans(portfolio.address), [BigNumber.from(0)])

    await token.mint(borrower.address, parseUSDC(10))
    await repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(10)), borrower)

    expect(await fixedInterestOnlyLoansValuationStrategy.activeLoans(portfolio.address))
      .to.deep.equal([])
  })

  it('moves last element of loans array to the index of removed element', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, repayFixedInterestOnlyLoan, deposit, borrower, addAcceptFundFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(amount)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(10), DAY, borrower, DAY)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(10), DAY, borrower, DAY)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(10), DAY, borrower, DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(20), borrower)

    assertEqualArrays(await fixedInterestOnlyLoansValuationStrategy.activeLoans(portfolio.address), [BigNumber.from(2), BigNumber.from(1)])
  })
})
