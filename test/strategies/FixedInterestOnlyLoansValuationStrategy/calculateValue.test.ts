import { expect } from 'chai'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { DAY } from 'utils/constants'
import { parseUSDC } from 'utils/parseUSDC'
import { setupFixtureLoader } from 'test/setup'

describe('FixedInterestOnlyLoansValuationStrategy.calculateValue', () => {
  const loadFixture = setupFixtureLoader()

  it('returns 0 when no FIOLs are in the strategy', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy } = await loadFixture(flexiblePortfolioFixture)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address)).to.equal(0)
  })

  it('returns principal for one loan upon funding', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit } = await loadFixture(flexiblePortfolioFixture)
    const principal = parseUSDC(100)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 1, interestPayment, DAY, borrower, DAY)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.be.closeTo(principal, parseUSDC(0.01))
  })

  it('includes part of interest payment over time', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    const principal = parseUSDC(100)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 1, interestPayment, DAY, borrower, DAY)

    const partialInterest = interestPayment.div(4)
    await timeTravel(DAY / 4)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.be.closeTo(principal.add(partialInterest), parseUSDC(0.01))
  })

  it('returns principal plus owed interest after end date has elapsed and one repayment has been made', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, borrower, deposit, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    const principal = parseUSDC(100)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 3, interestPayment, DAY, borrower, DAY)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, interestPayment, borrower)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, interestPayment, borrower)
    await timeTravel(DAY * 2)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.equal(principal.add(interestPayment))
  })

  it('includes previous interest payment when the borrower is late', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    const principal = parseUSDC(100)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 2, interestPayment, DAY, borrower, DAY)

    const partialInterest = interestPayment.div(4)
    await timeTravel(DAY + DAY / 4)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.be.closeTo(principal.add(interestPayment).add(partialInterest), parseUSDC(0.01))
  })

  it('does not include previous interest payment, when borrower has repaid it', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, timeTravel, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    const principal = parseUSDC(100)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 2, interestPayment, DAY, borrower, DAY)

    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, interestPayment, borrower)

    const partialInterest = interestPayment.div(4)
    await timeTravel(DAY / 4)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.be.closeTo(principal.add(partialInterest), parseUSDC(0.01))
  })

  it('returns 0 value if early repayments exceed principal plus estimated interest', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, token, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(100))
    const principal = parseUSDC(10)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 3, interestPayment, DAY, borrower, DAY)

    await repayFixedInterestOnlyLoan(0, interestPayment, borrower)
    await repayFixedInterestOnlyLoan(0, interestPayment, borrower)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.equal(0)
  })

  it('returns 0 value if repaid amount exceeds principal plus estimated interest', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, token, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(100))
    const principal = parseUSDC(5)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 2, interestPayment, DAY, borrower, DAY)

    await repayFixedInterestOnlyLoan(0, interestPayment, borrower)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.equal(0)
  })

  it('returns principal plus one interest payment when the loan end date is elapsed but not fully repaid', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    const principal = parseUSDC(100)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 1, interestPayment, DAY, borrower, DAY)
    await timeTravel(2 * DAY)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.equal(principal.add(interestPayment))
  })

  it('returns 0 after the loan is fully repaid', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, token, repayFixedInterestOnlyLoan, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(100))
    const principal = parseUSDC(100)
    const interestPayment = parseUSDC(10)

    await deposit(principal)
    await addAcceptFundFixedInterestOnlyLoan(principal, 1, interestPayment, DAY, borrower, DAY)

    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, principal.add(interestPayment), borrower)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.equal(0)
  })

  it('works for 2 loans in progress', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, token, repayFixedInterestOnlyLoan, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(100))
    await deposit(parseUSDC(100))

    const principalFirst = parseUSDC(50)
    const interestPaymentFirst = parseUSDC(10)
    const principalSecond = parseUSDC(20)
    const interestPaymentSecond = parseUSDC(5)

    await addAcceptFundFixedInterestOnlyLoan(principalFirst, 2, interestPaymentFirst, DAY, borrower, DAY)
    await addAcceptFundFixedInterestOnlyLoan(principalSecond, 2, interestPaymentSecond, DAY * 2, borrower, DAY)

    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, interestPaymentFirst, borrower)
    await timeTravel(DAY / 4)

    const unpaidInterestFirst = interestPaymentFirst.div(4)
    const unpaidInterestSecond = interestPaymentSecond.mul(5).div(8)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.be.closeTo(principalFirst.add(principalSecond).add(unpaidInterestFirst).add(unpaidInterestSecond), parseUSDC(0.01))
  })

  it('works for 1 loan completed and 1 in progress', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, token, repayFixedInterestOnlyLoan, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(100))
    await deposit(parseUSDC(100))

    const principalFirst = parseUSDC(50)
    const interestPaymentFirst = parseUSDC(10)
    const principalSecond = parseUSDC(20)
    const interestPaymentSecond = parseUSDC(5)

    await addAcceptFundFixedInterestOnlyLoan(principalFirst, 2, interestPaymentFirst, DAY, borrower, DAY)
    await addAcceptFundFixedInterestOnlyLoan(principalSecond, 2, interestPaymentSecond, DAY * 2, borrower, DAY)

    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, interestPaymentFirst, borrower)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(1, interestPaymentSecond, borrower)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, principalFirst.add(interestPaymentFirst), borrower)
    await timeTravel(DAY / 4)

    const unpaidInterestSecond = interestPaymentSecond.mul(5).div(8)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.be.closeTo(principalSecond.add(unpaidInterestSecond), parseUSDC(0.01))
  })

  it('works for 1 loan repaid early and 1 in progress', async () => {
    const { portfolio, fixedInterestOnlyLoansValuationStrategy, addAcceptFundFixedInterestOnlyLoan, borrower, deposit, token, repayFixedInterestOnlyLoan, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(borrower.address, parseUSDC(100))
    await deposit(parseUSDC(100))

    const principalFirst = parseUSDC(50)
    const interestPaymentFirst = parseUSDC(10)
    const principalSecond = parseUSDC(20)
    const interestPaymentSecond = parseUSDC(5)

    await addAcceptFundFixedInterestOnlyLoan(principalFirst, 2, interestPaymentFirst, DAY, borrower, DAY)
    await addAcceptFundFixedInterestOnlyLoan(principalSecond, 2, interestPaymentSecond, DAY * 2, borrower, DAY)

    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, interestPaymentFirst, borrower)
    await repayFixedInterestOnlyLoan(0, principalFirst.add(interestPaymentFirst), borrower)
    await timeTravel(DAY / 4)

    const unpaidInterestSecond = interestPaymentSecond.mul(5).div(8)

    expect(await fixedInterestOnlyLoansValuationStrategy.calculateValue(portfolio.address))
      .to.be.closeTo(principalSecond.add(unpaidInterestSecond), parseUSDC(0.01))
  })
})
