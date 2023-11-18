import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { bulletLoansFixture, Status } from 'fixtures'
import { parseUSDC } from 'utils'
import { YEAR } from 'utils'

const INVALID_LOAN_ID = 42

describe('BulletLoans.getStatus', () => {
  const loadFixture = setupFixtureLoader()

  it('returns "Created" for a newly-added loan', async () => {
    const { bulletLoans, createLoan } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()

    expect(await bulletLoans.getStatus(loanId)).to.equal(Status.Created)
  })

  it('returns "Started" for a started loan', async () => {
    const { bulletLoans, createLoan } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()
    await bulletLoans.start(loanId)

    expect(await bulletLoans.getStatus(loanId)).to.equal(Status.Started)
  })

  it('returns "FullyRepaid" for a loan that has been repaid in full', async () => {
    const { bulletLoans, createLoan, portfolio } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()
    await bulletLoans.start(loanId)

    await bulletLoans.connect(portfolio).repay(loanId, parseUSDC(6))
    expect(await bulletLoans.getStatus(loanId)).to.equal(Status.FullyRepaid)
  })

  it('returns "FullyRepaid" for a loan that has been overpaid', async () => {
    const { bulletLoans, createLoan, portfolio } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()
    await bulletLoans.start(loanId)

    await bulletLoans.connect(portfolio).repay(loanId, parseUSDC(6))
    expect(await bulletLoans.getStatus(loanId)).to.equal(Status.FullyRepaid)
  })

  it('returns the correct status for multiple loans', async () => {
    const { bulletLoans, createLoan, extractLoanId, portfolio, token } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()
    await bulletLoans.start(loanId)

    await bulletLoans.connect(portfolio).repay(loanId, parseUSDC(6))
    expect(await bulletLoans.getStatus(loanId)).to.equal(Status.FullyRepaid)

    const newLoanId = await extractLoanId(bulletLoans.connect(portfolio).createLoan(token.address, parseUSDC(5), parseUSDC(6), YEAR, portfolio.address))
    expect(await bulletLoans.getStatus(newLoanId)).to.equal(Status.Created)
  })

  it('reverts when trying to get status for a non-existent loan', async () => {
    const { bulletLoans } = await loadFixture(bulletLoansFixture)

    await expect(bulletLoans.getStatus(INVALID_LOAN_ID))
      .to.be.revertedWith('BulletLoans: Cannot get status of non-existent loan')
  })
})
