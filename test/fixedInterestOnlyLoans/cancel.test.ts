import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'

describe('FixedInterestOnlyLoans.cancel', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueLoan, cancelLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()
    await fixedInterestOnlyLoans.pause()

    await expect(cancelLoan(0)).to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by the owner', async () => {
    const { fixedInterestOnlyLoans, issueLoan, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()

    await expect(fixedInterestOnlyLoans.connect(borrower).cancel(0)).to.be.revertedWith('FixedInterestOnlyLoans: Not a loan owner')
  })

  describe('can be called in states', () => {
    it('Created', async () => {
      const { issueLoan, cancelLoan,
      } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueLoan()
      await expect(cancelLoan(0)).not.to.be.reverted
    })

    it('Accepted', async () => {
      const { issueLoan, acceptLoan, cancelLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueLoan()
      await acceptLoan(0)

      await expect(cancelLoan(0)).not.to.be.reverted
    })
  })

  describe('can not be called in states', () => {
    it('Started', async () => {
      const { fixedInterestOnlyLoans, issueLoan, acceptLoan, cancelLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueLoan()
      await acceptLoan(0)
      await fixedInterestOnlyLoans.start(0)

      await expect(cancelLoan(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
    })

    it('Canceled', async () => {
      const { issueLoan, acceptLoan, cancelLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueLoan()
      await acceptLoan(0)
      await cancelLoan(0)

      await expect(cancelLoan(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
    })
  })

  it('changes status', async () => {
    const { issueLoan, acceptLoan, fixedInterestOnlyLoans, cancelLoan, FixedInterestOnlyLoanStatus } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()
    await acceptLoan(0)
    await cancelLoan(0)

    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Cancelled)
  })

  it('emits an event', async () => {
    const { issueLoan, acceptLoan, cancelLoan, fixedInterestOnlyLoans, FixedInterestOnlyLoanStatus } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()
    await acceptLoan(0)

    await expect(cancelLoan(0))
      .to.emit(fixedInterestOnlyLoans, 'LoanStatusChanged')
      .withArgs(0, FixedInterestOnlyLoanStatus.Cancelled)
  })
})
