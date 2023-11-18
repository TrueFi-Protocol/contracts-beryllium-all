import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'

describe('FixedInterestOnlyLoans.acceptLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('changes loan status to "Accepted"', async () => {
    const { fixedInterestOnlyLoans, issueLoan, borrower, FixedInterestOnlyLoanStatus } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )

    await issueLoan()

    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)

    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Accepted)
  })

  it('emits LoanStatusChanged event', async () => {
    const { fixedInterestOnlyLoans, issueLoan, FixedInterestOnlyLoanStatus, borrower } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )

    await issueLoan()

    await expect(fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)).to.emit(fixedInterestOnlyLoans, 'LoanStatusChanged')
      .withArgs(0, FixedInterestOnlyLoanStatus.Accepted)
  })

  it('reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueLoan, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()
    fixedInterestOnlyLoans.pause()

    await expect(fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)).to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by borrower', async () => {
    const { fixedInterestOnlyLoans, issueLoan } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )

    await issueLoan()

    await expect(fixedInterestOnlyLoans.acceptLoan(0)).to.be.revertedWith('FixedInterestOnlyLoans: Not a borrower')
  })

  it('can only be called on loan with status "Created"', async () => {
    const { fixedInterestOnlyLoans, issueLoan, borrower } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )
    await issueLoan()

    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)

    await expect(fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
  })
})
