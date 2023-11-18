import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'
import { parseUSDC } from 'utils'

describe('FixedInterestOnlyLoans.markAsDefaulted', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, markLoanAsDefaulted, timeTravel, defaultLoanParams: { gracePeriod, periodDuration } } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await timeTravel(periodDuration + gracePeriod)
    await fixedInterestOnlyLoans.pause()

    await expect(markLoanAsDefaulted(0)).to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by the owner', async () => {
    const { fixedInterestOnlyLoans, issueLoan, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()

    await expect(fixedInterestOnlyLoans.connect(borrower).markAsDefaulted(0)).to.be.revertedWith('FixedInterestOnlyLoans: Not a loan owner')
  })

  it('cannot be called before gracePeriod passes', async () => {
    const { issueAndStart, markLoanAsDefaulted, timeTravel, defaultLoanParams: { gracePeriod, periodDuration } } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await timeTravel(periodDuration + gracePeriod - 10)
    await expect(markLoanAsDefaulted(0)).to.be.revertedWith('FixedInterestOnlyLoans: This loan cannot be defaulted')

    await timeTravel(10)
    await expect(markLoanAsDefaulted(0)).not.to.be.reverted
  })

  it('can be called in "Started" state', async () => {
    const { issueAndStart, markLoanAsDefaulted, timeTravel, defaultLoanParams: { gracePeriod, periodDuration } } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await timeTravel(periodDuration + gracePeriod)
    await expect(markLoanAsDefaulted(0)).not.to.be.reverted
  })

  describe('can not be called in states', () => {
    it('Created', async () => {
      const { issueLoan, markLoanAsDefaulted } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueLoan()

      await expect(markLoanAsDefaulted(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
    })

    it('Canceled', async () => {
      const { issueLoan, acceptLoan, markLoanAsDefaulted, cancelLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueLoan()
      await acceptLoan(0)
      await cancelLoan(0)

      await expect(markLoanAsDefaulted(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
    })

    it('Accepted', async () => {
      const { issueLoan, acceptLoan, markLoanAsDefaulted } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueLoan()
      await acceptLoan(0)

      await expect(markLoanAsDefaulted(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
    })

    it('Defaulted', async () => {
      const { issueAndStart, markLoanAsDefaulted, timeTravel, defaultLoanParams: { gracePeriod, periodDuration } } = await loadFixture(fixedInterestOnlyLoansFixture)

      await issueAndStart()

      await timeTravel(periodDuration + gracePeriod)
      await markLoanAsDefaulted(0)

      await expect(markLoanAsDefaulted(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
    })

    it('Repaid', async () => {
      const { issueAndStart, repayLoan, markLoanAsDefaulted } = await loadFixture(fixedInterestOnlyLoansFixture)
      await issueAndStart()

      await repayLoan(0, parseUSDC(10))
      await repayLoan(0, parseUSDC(10))
      await repayLoan(0, parseUSDC(10))
      await repayLoan(0, parseUSDC(10 + 100))

      await expect(markLoanAsDefaulted(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
    })
  })

  it('changes status', async () => {
    const { issueAndStart, fixedInterestOnlyLoans, markLoanAsDefaulted, FixedInterestOnlyLoanStatus, timeTravel, defaultLoanParams: { gracePeriod, periodDuration } } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()

    await timeTravel(periodDuration + gracePeriod)
    await markLoanAsDefaulted(0)

    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Defaulted)
  })

  it('emits an event', async () => {
    const { issueAndStart, markLoanAsDefaulted, fixedInterestOnlyLoans, FixedInterestOnlyLoanStatus, timeTravel, defaultLoanParams: { gracePeriod, periodDuration } } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()

    await timeTravel(periodDuration + gracePeriod)
    await expect(markLoanAsDefaulted(0))
      .to.emit(fixedInterestOnlyLoans, 'LoanStatusChanged')
      .withArgs(0, FixedInterestOnlyLoanStatus.Defaulted)
  })
})
