import { setupFixtureLoader } from 'test/setup'
import { BigNumber } from 'ethers'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'
import { parseUSDC } from 'utils'
import { assertEqualArrays } from 'utils/assertEqualArrays'

describe('FixedInterestOnlyLoans.repay', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, repayLoan } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await fixedInterestOnlyLoans.pause()

    await expect(repayLoan(0, parseUSDC(10))).to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by NFT owner', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, other } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await expect(fixedInterestOnlyLoans.connect(other).repay(0, 1)).to.be.revertedWith('FixedInterestOnlyLoans: Not a loan owner')
  })

  it('reverts if loan is already repaid', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, repayLoan } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10 + 100))

    await expect(fixedInterestOnlyLoans.repay(0, 1))
      .to.be.revertedWith('FixedInterestOnlyLoans: This loan cannot be repaid')
  })

  it('reverts if repayment amount is not expected in first periods', async () => {
    const { issueAndStart, repayLoan } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await repayLoan(0, parseUSDC(10))
    await expect(repayLoan(0, parseUSDC(9)))
      .to.be.revertedWith('FixedInterestOnlyLoans: Unexpected repayment amount')
  })

  it('reverts if payment amount is not expected in last period', async () => {
    const { issueAndStart, repayLoan } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await expect(repayLoan(0, parseUSDC(10 + 99)))
      .to.be.revertedWith('FixedInterestOnlyLoans: Unexpected repayment amount')
  })

  it('repays the loan', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, repayLoan } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10 + 100))

    expect(await fixedInterestOnlyLoans.periodsRepaid(0)).to.equal(await fixedInterestOnlyLoans.periodCount(0))
  })

  it('increments periodsRepaid', async () => {
    const { fixedInterestOnlyLoans, repayLoan, issueAndStart } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    expect(await fixedInterestOnlyLoans.periodsRepaid(0)).to.equal(0)
    await repayLoan(0, parseUSDC(10))
    expect(await fixedInterestOnlyLoans.periodsRepaid(0)).to.equal(1)
  })

  it('sets new currentPeriodEndDate', async () => {
    const { fixedInterestOnlyLoans, repayLoan, issueAndStart } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    const previousPeriodEndDate = await fixedInterestOnlyLoans.currentPeriodEndDate(0)
    await repayLoan(0, parseUSDC(10))
    const periodDuration = await fixedInterestOnlyLoans.periodDuration(0)
    expect(await fixedInterestOnlyLoans.currentPeriodEndDate(0)).to.equal(previousPeriodEndDate + periodDuration)
  })

  it('returns correct repaid interest in first periods', async () => {
    const { fixedInterestOnlyLoans, issueAndStart } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    assertEqualArrays(
      await fixedInterestOnlyLoans.callStatic.repay(0, parseUSDC(10)),
      [BigNumber.from(0), parseUSDC(10)],
    )
  })

  it('returns correct repaid principal and interest in the last period', async () => {
    const { fixedInterestOnlyLoans, repayLoan, issueAndStart } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    await repayLoan(0, parseUSDC(10))
    expect(await fixedInterestOnlyLoans.callStatic.repay(0, parseUSDC(110)))
      .to.deep.eq([parseUSDC(100), parseUSDC(10)])
  })

  it('emits Repaid event', async () => {
    const { fixedInterestOnlyLoans, repayLoan, issueAndStart } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueAndStart()

    await expect(repayLoan(0, parseUSDC(10)))
      .to.emit(fixedInterestOnlyLoans, 'Repaid')
      .withArgs(0, parseUSDC(10))
  })

  it('changes status to "Repaid" on last repay', async () => {
    const { fixedInterestOnlyLoans, issueLoan, fundLoan, acceptLoan, repayLoan, FixedInterestOnlyLoanStatus } = await loadFixture(fixedInterestOnlyLoansFixture)
    await issueLoan()
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Created)
    await acceptLoan(0)
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Accepted)

    await fundLoan(0)
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Started)

    await repayLoan(0, parseUSDC(10))
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Started)

    await repayLoan(0, parseUSDC(10))
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Started)

    await repayLoan(0, parseUSDC(10))
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Started)

    await repayLoan(0, parseUSDC(110))
    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Repaid)
  })
})
