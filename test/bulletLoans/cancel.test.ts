import { bulletLoansFixture, Status as BulletLoanStatus } from 'fixtures'
import { setupFixtureLoader } from 'test/setup'
import { expect } from 'chai'

describe('BulletLoans.cancel', () => {
  const loadFixture = setupFixtureLoader()

  it('can be called only by the owner', async () => {
    const { bulletLoans, borrower, createLoan } = await loadFixture(bulletLoansFixture)
    await createLoan()

    await expect(bulletLoans.connect(borrower).cancel(0))
      .to.be.revertedWith('BulletLoans: Caller is not the owner of the loan')
  })

  it('can only be called in Created state', async () => {
    const { bulletLoans, createLoan, portfolio } = await loadFixture(bulletLoansFixture)
    await createLoan()

    await bulletLoans.start(0)
    await expect(bulletLoans.connect(portfolio).cancel(0))
      .to.be.revertedWith('BulletLoans: Only created loan can be cancelled')
  })

  it('changes state of loan to Cancelled', async () => {
    const { bulletLoans, createLoan, portfolio } = await loadFixture(bulletLoansFixture)
    await createLoan()
    await bulletLoans.connect(portfolio).cancel(0)

    expect(await bulletLoans.getStatus(0)).to.equal(BulletLoanStatus.Cancelled)
  })

  it('emits LoanStatusChanged event', async () => {
    const { bulletLoans, createLoan, portfolio } = await loadFixture(bulletLoansFixture)
    await createLoan()

    await expect(bulletLoans.connect(portfolio).cancel(0))
      .to.emit(bulletLoans, 'LoanStatusChanged')
      .withArgs(0, BulletLoanStatus.Cancelled)
  })
})
