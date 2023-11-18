import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'
import { parseUSDC } from 'utils'

describe('FixedInterestOnlyLoans.expectedRepaymentAmount', () => {
  const loadFixture = setupFixtureLoader()

  it('returns amount to repay in the first periods', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, repayLoan, defaultLoanParams: { periodPayment } } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    expect(await fixedInterestOnlyLoans.expectedRepaymentAmount(0)).to.equal(periodPayment)
    await repayLoan(0, parseUSDC(10))
    expect(await fixedInterestOnlyLoans.expectedRepaymentAmount(0)).to.equal(periodPayment)
  })

  it('returns amount to repay in the last period', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, repayLoan, defaultLoanParams: { periodPayment, principal } } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    expect(await fixedInterestOnlyLoans.expectedRepaymentAmount(0)).to.equal(periodPayment.add(principal))
  })

  it('helps to repay the loan', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, repayLoan } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await repayLoan(0, await fixedInterestOnlyLoans.expectedRepaymentAmount(0))
    await repayLoan(0, await fixedInterestOnlyLoans.expectedRepaymentAmount(0))
    await repayLoan(0, await fixedInterestOnlyLoans.expectedRepaymentAmount(0))
    await repayLoan(0, await fixedInterestOnlyLoans.expectedRepaymentAmount(0))

    expect(await fixedInterestOnlyLoans.periodsRepaid(0)).to.equal(await fixedInterestOnlyLoans.periodCount(0))
  })
})
