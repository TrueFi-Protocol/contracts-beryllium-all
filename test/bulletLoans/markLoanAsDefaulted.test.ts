import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils'
import { bulletLoansFixture, Status } from 'fixtures'

const INVALID_LOAN_ID = 42

describe('BulletLoans.markAsDefaulted', () => {
  const loadFixture = setupFixtureLoader()

  it('cannot mark non-existent loan', async () => {
    const { bulletLoans, portfolio } = await loadFixture(bulletLoansFixture)

    await expect(bulletLoans.connect(portfolio).markAsDefaulted(INVALID_LOAN_ID))
      .to.be.revertedWith('ERC721: owner query for nonexistent token')
  })

  it('reverts if caller is not the owner of the loan', async () => {
    const { bulletLoans, borrower, createLoan } = await loadFixture(bulletLoansFixture)
    const instrumentId = await createLoan()

    await expect(bulletLoans.connect(borrower).markAsDefaulted(instrumentId))
      .to.be.revertedWith('BulletLoans: Caller is not the owner of the loan')
  })

  it('cannot mark already defaulted loan', async () => {
    const { bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const instrumentId = await createLoan()

    await bulletLoans.connect(portfolio).markAsDefaulted(instrumentId)

    await expect(bulletLoans.connect(portfolio).markAsDefaulted(instrumentId))
      .to.be.revertedWith('BulletLoans: Only created or started loan can be marked as defaulted')
  })

  it('cannot mark resolved loan', async () => {
    const { bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const instrumentId = await createLoan()

    await bulletLoans.connect(portfolio).markAsDefaulted(instrumentId)
    await bulletLoans.connect(portfolio).markLoanAsResolved(instrumentId)

    await expect(bulletLoans.connect(portfolio).markAsDefaulted(instrumentId))
      .to.be.revertedWith('BulletLoans: Only created or started loan can be marked as defaulted')
  })

  it('cannot mark fully repaid loan', async () => {
    const { token, owner, bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const instrumentId = await createLoan()
    await bulletLoans.start(instrumentId)
    await token.mint(owner.address, parseUSDC(6))
    await token.connect(owner).approve(bulletLoans.address, parseUSDC(6))
    await bulletLoans.connect(portfolio).repay(instrumentId, parseUSDC(6))

    await expect(bulletLoans.connect(portfolio).markAsDefaulted(instrumentId))
      .to.be.revertedWith('BulletLoans: Only created or started loan can be marked as defaulted')
  })

  it('changes loan status', async () => {
    const { bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const instrumentId = await createLoan()

    await bulletLoans.connect(portfolio).markAsDefaulted(instrumentId)
    expect((await bulletLoans.loans(instrumentId)).status).to.equal(Status.Defaulted)

    const instrumentId2 = await createLoan()
    await bulletLoans.start(instrumentId2)

    await bulletLoans.connect(portfolio).markAsDefaulted(instrumentId2)
    expect((await bulletLoans.loans(instrumentId2)).status).to.equal(Status.Defaulted)
  })

  it('emits event', async () => {
    const { bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const instrumentId = await createLoan()

    await expect(bulletLoans.connect(portfolio).markAsDefaulted(instrumentId))
      .to.emit(bulletLoans, 'LoanStatusChanged')
      .withArgs(instrumentId, Status.Defaulted)
  })
})
