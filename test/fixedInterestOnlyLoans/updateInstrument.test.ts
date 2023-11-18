import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'
import { DAY } from 'utils'

describe('FixedInterestOnlyLoans.updateInstrument', () => {
  const loadFixture = setupFixtureLoader()

  it('changes gracePeriod', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, defaultLoanParams: { gracePeriod: initialGracePeriod } } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()

    expect(await fixedInterestOnlyLoans.gracePeriod(0)).to.equal(initialGracePeriod)

    const newGracePeriod = initialGracePeriod + DAY
    await fixedInterestOnlyLoans.updateInstrument(0, newGracePeriod)

    expect(await fixedInterestOnlyLoans.gracePeriod(0)).to.equal(newGracePeriod)
  })

  it('cannot shorten grace period', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, defaultLoanParams: { gracePeriod: initialGracePeriod } } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()

    expect(await fixedInterestOnlyLoans.gracePeriod(0)).to.equal(initialGracePeriod)

    const newGracePeriod = initialGracePeriod - DAY
    await expect(fixedInterestOnlyLoans.updateInstrument(0, newGracePeriod)).to.be.revertedWith('FixedInterestOnlyLoans: Grace period can only be extended')
  })

  it('emits en event', async () => {
    const { fixedInterestOnlyLoans, issueAndStart } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()

    await expect(fixedInterestOnlyLoans.updateInstrument(0, DAY * 4))
      .to.emit(fixedInterestOnlyLoans, 'GracePeriodUpdated')
  })

  it('reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueAndStart } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await fixedInterestOnlyLoans.pause()

    await expect(fixedInterestOnlyLoans.updateInstrument(0, DAY * 4)).to.be.revertedWith('Pausable: paused')
  })

  it('can be called only by a loan owner', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()

    await expect(fixedInterestOnlyLoans.connect(borrower).updateInstrument(0, DAY * 4))
      .to.be.revertedWith('FixedInterestOnlyLoans: Not a loan owner')
  })

  it('can be only called in "Started" status', async () => {
    const { fixedInterestOnlyLoans, issueLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueLoan()

    await expect(fixedInterestOnlyLoans.updateInstrument(0, DAY * 4))
      .to.be.revertedWith('FixedInterestOnlyLoans: Unexpected loan status')
  })
})
