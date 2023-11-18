import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { bulletLoansFixture, Status } from 'fixtures'
import { parseUSDC, YEAR } from 'utils'

const INVALID_LOAN_ID = 42

describe('BulletLoans.markLoanAsResolved', () => {
  const loadFixture = setupFixtureLoader()

  it('cannot mark non-existent loan', async () => {
    const { bulletLoans, portfolio } = await loadFixture(bulletLoansFixture)

    await expect(bulletLoans.connect(portfolio).markLoanAsResolved(INVALID_LOAN_ID))
      .to.be.revertedWith('ERC721: owner query for nonexistent token')
  })

  it('reverts if caller is not the owner of the loan', async () => {
    const { bulletLoans, borrower, createLoan } = await loadFixture(bulletLoansFixture)
    const defaultedLoanId = await createLoan()

    await expect(bulletLoans.connect(borrower).markLoanAsResolved(defaultedLoanId))
      .to.be.revertedWith('BulletLoans: Caller is not the owner of the loan')
  })

  it('can mark only defaulted loan', async () => {
    const { bulletLoans, borrower, createLoan, portfolio, extractLoanId, token } = await loadFixture(bulletLoansFixture)
    const defaultedLoanId = await createLoan()
    await bulletLoans.connect(portfolio).markAsDefaulted(defaultedLoanId)

    await bulletLoans.connect(portfolio).markLoanAsResolved(defaultedLoanId)
    await expect(bulletLoans.connect(portfolio).markLoanAsResolved(defaultedLoanId))
      .to.be.revertedWith('BulletLoans: Cannot resolve not defaulted loan')
    const loanId = await extractLoanId(bulletLoans.connect(portfolio).createLoan(token.address, parseUSDC(5), parseUSDC(6), YEAR, borrower.address))
    await expect(bulletLoans.connect(portfolio).markLoanAsResolved(loanId))
      .to.be.revertedWith('BulletLoans: Cannot resolve not defaulted loan')
  })

  it('changes loan status', async () => {
    const { bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const defaultedLoanId = await createLoan()
    await bulletLoans.connect(portfolio).markAsDefaulted(defaultedLoanId)

    expect((await bulletLoans.loans(defaultedLoanId)).status).to.equal(Status.Defaulted)
    await bulletLoans.connect(portfolio).markLoanAsResolved(defaultedLoanId)
    expect((await bulletLoans.loans(defaultedLoanId)).status).to.equal(Status.Resolved)
  })

  it('emits event', async () => {
    const { bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const defaultedLoanId = await createLoan()
    await bulletLoans.connect(portfolio).markAsDefaulted(defaultedLoanId)

    await expect(bulletLoans.connect(portfolio).markLoanAsResolved(defaultedLoanId))
      .to.emit(bulletLoans, 'LoanStatusChanged')
      .withArgs(defaultedLoanId, Status.Resolved)
  })
})
