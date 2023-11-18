import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils'
import { DAY } from 'utils/constants'
import { bulletLoansValuationStrategyFixture } from 'fixtures'

const DELTA = 30

describe('BulletLoansValuationStrategy.calculateValue', () => {
  const loadFixture = setupFixtureLoader()

  it('is 0 when portfolio has no loans', async () => {
    const { valuationStrategy, deposit, portfolio } = await loadFixture(bulletLoansValuationStrategyFixture)
    await deposit(parseUSDC(50))

    expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(0)
  })

  describe('one loan scenarios', () => {
    it('is principal when new loan issued', async () => {
      const fixture = await loadFixture(bulletLoansValuationStrategyFixture)
      const { portfolio, valuationStrategy, borrower, deposit, addAndFundBulletLoan } = fixture

      await deposit(parseUSDC(50))

      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10), DELTA)
    })

    it('accrues interest linearly', async () => {
      const fixture = await loadFixture(bulletLoansValuationStrategyFixture)
      const { portfolio, valuationStrategy, borrower, deposit, addAndFundBulletLoan, timeTravel } = fixture

      await deposit(parseUSDC(50))
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      await timeTravel(DAY * 3)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10.1), DELTA)

      await timeTravel(DAY * 3)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10.2), DELTA)
    })

    it('is total debt when loan repayment date is elapsed', async () => {
      const fixture = await loadFixture(bulletLoansValuationStrategyFixture)
      const { portfolio, valuationStrategy, borrower, deposit, addAndFundBulletLoan, timeTravel } = fixture

      await deposit(parseUSDC(50))
      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      await timeTravel(DAY * 30)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(11), DELTA)

      await timeTravel(DAY)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(11), DELTA)
    })

    it('accounts for partial repayments', async () => {
      const fixture = await loadFixture(bulletLoansValuationStrategyFixture)
      const { portfolio, valuationStrategy, borrower, deposit, addAndFundBulletLoan, timeTravel, repayBulletLoan } = fixture

      await deposit(parseUSDC(50))
      const { loanId } = await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10), DELTA)

      await repayBulletLoan(loanId, parseUSDC(5), borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10 - 5), DELTA)

      await timeTravel(DAY * 3)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10.1 - 5), DELTA)
    })

    it('accounts for full repayments', async () => {
      const fixture = await loadFixture(bulletLoansValuationStrategyFixture)
      const { portfolio, valuationStrategy, borrower, deposit, addAndFundBulletLoan, timeTravel, repayBulletLoan, token } = fixture

      await deposit(parseUSDC(50))
      const { loanId } = await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10), DELTA)

      await token.mint(borrower.address, parseUSDC(11))
      await repayBulletLoan(loanId, parseUSDC(11), borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(0)

      await timeTravel(DAY * 3)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(0)

      await timeTravel(DAY * 27)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(0)
    })

    it('does not include defaulted loans', async () => {
      const fixture = await loadFixture(bulletLoansValuationStrategyFixture)
      const { portfolio, valuationStrategy, borrower, deposit, addAndFundBulletLoan, wallet, bulletLoans } = fixture

      await deposit(parseUSDC(50))
      const { loanId } = await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10), DELTA)

      await portfolio.connect(wallet).markInstrumentAsDefaulted(bulletLoans.address, loanId)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(0)
    })
  })

  describe('two loan scenarios', () => {
    it('is sum of newly issued loans principals', async () => {
      const { portfolio, valuationStrategy, borrower, deposit, addAndFundBulletLoan } = await loadFixture(bulletLoansValuationStrategyFixture)
      await deposit(parseUSDC(50))

      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      await addAndFundBulletLoan(parseUSDC(20), parseUSDC(30), 60 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10 + 20), DELTA)
    })

    it('accrues interest linearly, according to repayment dates', async () => {
      const { portfolio, valuationStrategy, borrower, deposit, timeTravel, addAndFundBulletLoan } = await loadFixture(bulletLoansValuationStrategyFixture)
      await deposit(parseUSDC(50))

      await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)

      await addAndFundBulletLoan(parseUSDC(20), parseUSDC(30), 60 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10 + 20), DELTA)
      await timeTravel(DAY * 3)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10.1 + 20.5), DELTA)
      await timeTravel(DAY * 3)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10.2 + 21), DELTA)
      await timeTravel(DAY * 24)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(11 + 25), DELTA)
      await timeTravel(DAY * 3)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(11 + 25.5), DELTA)
      await timeTravel(DAY * 27)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(11 + 30), DELTA)
      await timeTravel(DAY)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(11 + 30), DELTA)
    })

    it('accounts for repayments', async () => {
      const { portfolio, valuationStrategy, borrower, deposit, repayBulletLoan, timeTravel, addAndFundBulletLoan } = await loadFixture(bulletLoansValuationStrategyFixture)
      await deposit(parseUSDC(50))
      const { loanId: firstLoanId } = await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)
      const { loanId: secondLoanId } = await addAndFundBulletLoan(parseUSDC(20), parseUSDC(30), 60 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10 + 20), DELTA)
      await repayBulletLoan(firstLoanId, parseUSDC(5), borrower)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(5 + 20), DELTA)
      await timeTravel(DAY * 3)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(5.1 + 20.5), DELTA)
      await repayBulletLoan(secondLoanId, parseUSDC(10), borrower)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(5.1 + 10.5), DELTA)
      await repayBulletLoan(firstLoanId, parseUSDC(6), borrower)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(0 + 10.5), DELTA)

      await timeTravel(DAY * 3)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(0 + 11), DELTA)
      await repayBulletLoan(secondLoanId, parseUSDC(5), borrower)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(0 + 6), DELTA)
    })

    it('doesn\'t include defaulted loans', async () => {
      const { portfolio, valuationStrategy, wallet, borrower, deposit, timeTravel, addAndFundBulletLoan, bulletLoans } = await loadFixture(bulletLoansValuationStrategyFixture)
      await deposit(parseUSDC(50))

      const { loanId: firstLoanId } = await addAndFundBulletLoan(parseUSDC(10), parseUSDC(11), 30 * DAY, borrower)
      const { loanId: secondLoanId } = await addAndFundBulletLoan(parseUSDC(20), parseUSDC(30), 60 * DAY, borrower)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(10 + 20), DELTA)
      await portfolio.connect(wallet).markInstrumentAsDefaulted(bulletLoans.address, firstLoanId)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(20), DELTA)

      await timeTravel(DAY * 3)

      expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(20.5), DELTA)
      await portfolio.connect(wallet).markInstrumentAsDefaulted(bulletLoans.address, secondLoanId)
      expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(0)
    })
  })
})
