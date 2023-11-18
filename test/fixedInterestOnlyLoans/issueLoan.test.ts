import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { AddressZero, Zero } from '@ethersproject/constants'

describe('FixedInterestOnlyLoans.issueLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('mints token', async () => {
    const { fixedInterestOnlyLoans, issueLoan, owner } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()

    expect(await fixedInterestOnlyLoans.ownerOf(0)).to.equal(owner.address)
  })

  it('returns incremented id', async () => {
    const { fixedInterestOnlyLoans, issueLoan, borrower, defaultLoanParams: { principal, periodCount, periodPayment, periodDuration, gracePeriod } } =
      await loadFixture(fixedInterestOnlyLoansFixture)

    expect(
      await fixedInterestOnlyLoans.callStatic.issueLoan(AddressZero, principal, periodCount, periodPayment, periodDuration, borrower.address, gracePeriod, false),
    ).to.equal(0)

    await issueLoan()

    expect(
      await fixedInterestOnlyLoans.callStatic.issueLoan(AddressZero, principal, periodCount, periodPayment, periodDuration, borrower.address, gracePeriod, false),
    ).to.equal(1)
  })

  it('emits IssueLoan event', async () => {
    const { fixedInterestOnlyLoans, issueLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

    await expect(issueLoan()).to.emit(fixedInterestOnlyLoans, 'LoanIssued').withArgs(0)
    await expect(issueLoan()).to.emit(fixedInterestOnlyLoans, 'LoanIssued').withArgs(1)
  })

  it('does not set endDate', async () => {
    const { fixedInterestOnlyLoans, issueLoan } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueLoan()

    expect(await fixedInterestOnlyLoans.endDate(0)).to.equal(Zero)
  })

  it('reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

    await fixedInterestOnlyLoans.pause()

    await expect(issueLoan()).to.be.revertedWith('Pausable: paused')
  })

  it('requires recipient with non-zero address', async () => {
    const { fixedInterestOnlyLoans } = await loadFixture(fixedInterestOnlyLoansFixture)

    await expect(fixedInterestOnlyLoans.issueLoan(AddressZero, 0, 0, 0, 0, AddressZero, 0, false))
      .to.be.revertedWith('FixedInterestOnlyLoans: recipient cannot be the zero address')
  })

  it('requires period duration greater than 0', async () => {
    const { fixedInterestOnlyLoans, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)

    await expect(fixedInterestOnlyLoans.issueLoan(AddressZero, 1, 1, 1, 0, borrower.address, 0, false))
      .to.be.revertedWith('FixedInterestOnlyLoans: Loan duration must be greater than 0')
  })

  it('requires period count greater than 0', async () => {
    const { fixedInterestOnlyLoans, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)

    await expect(fixedInterestOnlyLoans.issueLoan(AddressZero, 1, 0, 1, 1, borrower.address, 0, false))
      .to.be.revertedWith('FixedInterestOnlyLoans: Loan duration must be greater than 0')
  })

  it('requires total interest to be greater than 0', async () => {
    const { fixedInterestOnlyLoans, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)

    const zeroPeriodPayment = 0
    await expect(fixedInterestOnlyLoans.issueLoan(AddressZero, 0, 1, zeroPeriodPayment, 1, borrower.address, 0, false))
      .to.be.revertedWith('FixedInterestOnlyLoans: Total interest must be greater than 0')
  })
})
