import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { DAY, parseUSDC } from 'utils'

describe('MultiInstrumentValuationStrategy.onInstrumentUpdated', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if paused', async () => {
    const {
      valuationStrategy,
      deposit,
      addAndFundBulletLoan,
      repayBulletLoan,
      borrower,
    } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(100))
    await addAndFundBulletLoan(parseUSDC(100), parseUSDC(100), DAY, borrower)
    await valuationStrategy.pause()
    const tx = repayBulletLoan(0, parseUSDC(100), borrower)
    await expect(tx)
      .to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by portfolio', async () => {
    const {
      valuationStrategy,
      bulletLoans,
      bulletLoansValuationStrategy,
      portfolio,
    } = await loadFixture(flexiblePortfolioFixture)
    await expect(valuationStrategy.onInstrumentUpdated(portfolio.address, bulletLoans.address, bulletLoansValuationStrategy.address))
      .to.be.revertedWith('MultiInstrumentValuationStrategy: Can only be called by portfolio')
  })

  it('calls onInstrumentUpdated on child strategy', async () => {
    const {
      bulletLoans,
      deposit,
      portfolio,
      addAndFundBulletLoan,
      repayBulletLoan,
      borrower,
      bulletLoansValuationStrategy,
    } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(100))
    await addAndFundBulletLoan(parseUSDC(100), parseUSDC(100), DAY, borrower)
    const tx = await repayBulletLoan(0, parseUSDC(100), borrower)
    await expect(tx)
      .to.emit(bulletLoansValuationStrategy, 'InstrumentRemoved')
      .withArgs(portfolio.address, bulletLoans.address, 0)
  })

  it('reverts on unknown portfolio', async () => {
    const {
      valuationStrategy,
      wallet,
    } = await loadFixture(flexiblePortfolioFixture)
    await expect(valuationStrategy.onInstrumentUpdated(wallet.address, wallet.address, 0)).to.be.revertedWith('function call to a non-contract account')
  })
})
