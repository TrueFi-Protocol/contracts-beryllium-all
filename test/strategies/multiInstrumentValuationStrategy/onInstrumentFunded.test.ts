import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { DAY, parseUSDC } from 'utils'

describe('MultiInstrumentValuationStrategy.onInstrumentFunded', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if paused', async () => {
    const { valuationStrategy, bulletLoans, deposit, portfolio, addBulletLoan, borrower } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(100))
    await addBulletLoan(parseUSDC(100), parseUSDC(100), DAY, borrower)
    await valuationStrategy.pause()
    await expect(portfolio.fundInstrument(bulletLoans.address, 0))
      .to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by portfolio', async () => {
    const {
      valuationStrategy,
      bulletLoans,
      portfolio,
    } = await loadFixture(flexiblePortfolioFixture)
    await expect(valuationStrategy.onInstrumentFunded(portfolio.address, bulletLoans.address, 0))
      .to.be.revertedWith('MultiInstrumentValuationStrategy: Can only be called by portfolio')
  })

  it('calls onInstrumentFunded on child strategy', async () => {
    const { bulletLoans, deposit, portfolio, addBulletLoan, borrower, bulletLoansValuationStrategy } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(100))
    await addBulletLoan(parseUSDC(100), parseUSDC(100), DAY, borrower)
    await expect(portfolio.fundInstrument(bulletLoans.address, 0))
      .to.emit(bulletLoansValuationStrategy, 'InstrumentAdded')
      .withArgs(portfolio.address, bulletLoans.address, 0)
  })

  it('reverts on unknown portfolio', async () => {
    const {
      valuationStrategy,
      wallet,
    } = await loadFixture(flexiblePortfolioFixture)
    await expect(valuationStrategy.onInstrumentFunded(wallet.address, wallet.address, 0)).to.be.revertedWith('function call to a non-contract account')
  })
})
