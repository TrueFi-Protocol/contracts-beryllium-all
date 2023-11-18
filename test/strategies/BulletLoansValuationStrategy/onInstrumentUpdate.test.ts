import { setupFixtureLoader } from 'test/setup'
import { bulletLoansValuationStrategyFixture } from 'fixtures'
import { expect } from 'chai'
import { DAY, parseUSDC } from 'utils'

describe('BulletLoansValuationStrategy.onInstrumentUpdated', () => {
  const loadFixture = setupFixtureLoader()

  describe('on fully repaid loan', () => {
    it('removes instrumentId from list', async () => {
      const {
        valuationStrategy,
        portfolio,
        addAndFundBulletLoan,
        borrower,
        deposit,
        repayBulletLoan,
      } = await loadFixture(bulletLoansValuationStrategyFixture)
      await deposit(parseUSDC(100))
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      expect(await valuationStrategy.getBulletLoans(portfolio.address)).to.have.length(3)

      await repayBulletLoan(0, parseUSDC(11), borrower)

      const loans = await valuationStrategy.getBulletLoans(portfolio.address)
      expect(loans).to.have.length(2)
      expect(loans[0]).to.equal(2)
      expect(loans[1]).to.equal(1)
    })

    it('emits en event', async () => {
      const {
        bulletLoans,
        valuationStrategy,
        portfolio,
        deposit,
        addAndFundBulletLoan,
        borrower,
        repayBulletLoan,
        token,
      } = await loadFixture(bulletLoansValuationStrategyFixture)

      await deposit(parseUSDC(100))
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      await token.transfer(borrower.address, parseUSDC(1))

      await expect(repayBulletLoan(0, parseUSDC(11), borrower))
        .to.emit(valuationStrategy, 'InstrumentRemoved')
        .withArgs(portfolio.address, bulletLoans.address, 0)
    })
  })

  describe('on partially repaid loan', () => {
    it('does not remove instrumentId from list', async () => {
      const {
        valuationStrategy,
        portfolio,
        addAndFundBulletLoan,
        borrower,
        deposit,
        repayBulletLoan,
      } = await loadFixture(bulletLoansValuationStrategyFixture)
      await deposit(parseUSDC(100))
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      expect(await valuationStrategy.getBulletLoans(portfolio.address)).to.have.length(2)

      await repayBulletLoan(0, parseUSDC(5.5), borrower)

      const loans = await valuationStrategy.getBulletLoans(portfolio.address)
      expect(loans).to.have.length(2)
      expect(loans[0]).to.equal(0)
      expect(loans[1]).to.equal(1)
    })

    it('does not emit en event', async () => {
      const {
        valuationStrategy,
        deposit,
        addAndFundBulletLoan,
        repayBulletLoan,
        borrower,
      } = await loadFixture(bulletLoansValuationStrategyFixture)

      await deposit(parseUSDC(100))
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      await expect(repayBulletLoan(0, parseUSDC(5.5), borrower))
        .not.to.emit(valuationStrategy, 'InstrumentRemoved')
    })
  })
})
