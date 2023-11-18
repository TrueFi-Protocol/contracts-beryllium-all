import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'
import { getTxTimestamp } from 'utils'

describe('FixedInterestOnlyLoans.start', () => {
  const loadFixture = setupFixtureLoader()

  it('changes status', async () => {
    const { fixedInterestOnlyLoans, issueLoan, FixedInterestOnlyLoanStatus, acceptLoan } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )
    await issueLoan()
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Created)

    await acceptLoan(0)

    await fixedInterestOnlyLoans.start(0)
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Started)
  })

  it('reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueLoan, acceptLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()
    await acceptLoan(0)
    await fixedInterestOnlyLoans.pause()

    await expect(fixedInterestOnlyLoans.start(0)).to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by owner', async () => {
    const { fixedInterestOnlyLoans, issueLoan, borrower } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )

    await issueLoan()

    await expect(
      fixedInterestOnlyLoans.connect(borrower).start(0),
    ).to.be.revertedWith('FixedInterestOnlyLoans: Not a loan owner')
  })

  it('cannot start a not issued loan', async () => {
    const { fixedInterestOnlyLoans } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )

    await expect(fixedInterestOnlyLoans.start(0)).to.be.revertedWith('ERC721: owner query for nonexistent token')
  })

  it('emits LoanStatusChanged event', async () => {
    const { fixedInterestOnlyLoans, issueLoan, FixedInterestOnlyLoanStatus, acceptLoan } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )
    await issueLoan()
    await acceptLoan(0)
    await expect(fixedInterestOnlyLoans.start(0)).to.emit(fixedInterestOnlyLoans, 'LoanStatusChanged')
      .withArgs(0, FixedInterestOnlyLoanStatus.Started)
  })

  it('can only start "Accepted" loan', async () => {
    const { fixedInterestOnlyLoans, issueLoan, acceptLoan } = await loadFixture(
      fixedInterestOnlyLoansFixture,
    )
    await issueLoan()

    await expect(fixedInterestOnlyLoans.start(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')

    await acceptLoan(0)

    await fixedInterestOnlyLoans.start(0)
    await expect(fixedInterestOnlyLoans.start(0)).to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
  })

  it('sets end date', async () => {
    const { fixedInterestOnlyLoans, issueLoan, acceptLoan, defaultLoanParams: { periodDuration, periodCount }, provider } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueLoan()
    await acceptLoan(0)

    const tx = await fixedInterestOnlyLoans.start(0)
    const timestamp = await getTxTimestamp(tx, provider)

    expect(await fixedInterestOnlyLoans.endDate(0)).to.equal(timestamp + periodDuration * periodCount)
  })

  it('starts new period', async () => {
    const { fixedInterestOnlyLoans, issueLoan, acceptLoan, defaultLoanParams: { periodDuration }, provider } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueLoan()

    await acceptLoan(0)
    const tx = await fixedInterestOnlyLoans.start(0)
    const timestamp = await getTxTimestamp(tx, provider)

    expect(await fixedInterestOnlyLoans.currentPeriodEndDate(0)).to.equal(timestamp + periodDuration)
  })
})
