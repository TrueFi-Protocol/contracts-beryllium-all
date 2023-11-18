import { FixedInterestOnlyLoansValuationStrategy__factory, MockParentStrategy__factory } from 'build/types'
import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { DAY, parseUSDC } from 'utils'
import { setupFixtureLoader } from 'test/setup'
import { assertEqualArrays } from 'utils/assertEqualArrays'

describe('FixedInterestOnlyLoansValuationStrategy.onInstrumentFunded', () => {
  const loadFixture = setupFixtureLoader()
  const amount = parseUSDC(100)

  it('reverts if paused', async () => {
    const { deposit, fixedInterestOnlyLoans, fixedInterestOnlyLoansValuationStrategy, portfolio, borrower, addFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(amount)
    await addFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(1), 30 * DAY, borrower, DAY)
    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)
    await fixedInterestOnlyLoansValuationStrategy.pause()

    await expect(portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0))
      .to.be.revertedWith('Pausable: paused')
  })

  it('reverts if caller is not portfolio or parent strategy', async () => {
    const { fixedInterestOnlyLoansValuationStrategy, fixedInterestOnlyLoans, other, portfolio } = await loadFixture(flexiblePortfolioFixture)

    await expect(fixedInterestOnlyLoansValuationStrategy.connect(other).onInstrumentFunded(portfolio.address, fixedInterestOnlyLoans.address, 0))
      .to.be.revertedWith('FixedInterestOnlyLoansValuationStrategy: Only portfolio or parent strategy')
  })

  it('reverts if it is called with an unknown instrument', async () => {
    const { fixedInterestOnlyLoansValuationStrategy, other } = await loadFixture(flexiblePortfolioFixture)

    await expect(fixedInterestOnlyLoansValuationStrategy.connect(other).onInstrumentFunded(other.address, other.address, 0))
      .to.be.revertedWith('FixedInterestOnlyLoansValuationStrategy: Unexpected instrument')
  })

  it('can be called directly by portfolio', async () => {
    const { fixedInterestOnlyLoansValuationStrategy, borrower, portfolio, addAcceptFundFixedInterestOnlyLoan, deposit } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.setValuationStrategy(fixedInterestOnlyLoansValuationStrategy.address)

    await deposit(amount)
    await addAcceptFundFixedInterestOnlyLoan(amount.div(2), 1, parseUSDC(10), DAY, borrower, DAY)

    expect(await fixedInterestOnlyLoansValuationStrategy.isActive(portfolio.address, 0))
      .to.equal(true)
  })

  it('sets isActive status', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, deposit, borrower, addAcceptFundFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(amount)

    expect(await fixedInterestOnlyLoansValuationStrategy.isActive(portfolio.address, 0))
      .to.equal(false)

    await addAcceptFundFixedInterestOnlyLoan(amount.div(2), 1, parseUSDC(10), DAY, borrower, DAY)

    expect(await fixedInterestOnlyLoansValuationStrategy.isActive(portfolio.address, 0))
      .to.equal(true)
  })

  it('adds instrument id to loans array', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, deposit, borrower, addAcceptFundFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(amount)
    await addAcceptFundFixedInterestOnlyLoan(amount.div(2), 1, parseUSDC(10), DAY, borrower, DAY)
    await addAcceptFundFixedInterestOnlyLoan(amount.div(2), 1, parseUSDC(10), DAY, borrower, DAY)

    assertEqualArrays(
      await fixedInterestOnlyLoansValuationStrategy.activeLoans(portfolio.address),
      [BigNumber.from(0), BigNumber.from(1)],
    )
  })

  it('disallows adding the same instrument twice', async () => {
    const { wallet, portfolio, protocolConfig, fixedInterestOnlyLoans } = await loadFixture(flexiblePortfolioFixture)

    const parentStrategy = await new MockParentStrategy__factory(wallet).deploy()
    const fixedInterestOnlyLoansValuationStrategy = await deployBehindProxy(new FixedInterestOnlyLoansValuationStrategy__factory(wallet), protocolConfig.address, fixedInterestOnlyLoans.address, parentStrategy.address)
    await parentStrategy.initialize(fixedInterestOnlyLoansValuationStrategy.address)
    await parentStrategy.onInstrumentFunded(portfolio.address, fixedInterestOnlyLoans.address, 0)

    await expect(parentStrategy.onInstrumentFunded(portfolio.address, fixedInterestOnlyLoans.address, 0))
      .to.be.revertedWith('FixedInterestOnlyLoansValuationStrategy: Loan is already active for this portfolio')
  })
})
