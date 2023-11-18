import { AddressZero } from '@ethersproject/constants'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC, YEAR } from 'utils'
import { bulletLoansFixture, Status } from 'fixtures'

describe('BulletLoans.createLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('assigns loanIds sequentially', async () => {
    const { createLoan } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()
    expect(loanId).to.equal(0)
    const loanId2 = await createLoan()
    expect(loanId2).to.equal(1)
  })

  it('cannot have a zero duration', async () => {
    const { bulletLoans, portfolio, borrower, token } = await loadFixture(bulletLoansFixture)

    await expect(bulletLoans.connect(portfolio).createLoan(token.address, parseUSDC(5), parseUSDC(6), 0, borrower.address)).to.be.revertedWith('BulletLoans: Loan duration must be nonzero')
  })

  it('mints loan to the portfolio', async () => {
    const { bulletLoans, portfolio, createLoan } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()

    expect(await bulletLoans.ownerOf(loanId)).to.equal(portfolio.address)
  })

  it('correctly initializes loan parameters', async () => {
    const { bulletLoans, extractLoanId, portfolio, token, borrower } = await loadFixture(bulletLoansFixture)

    const pendingLoanCreationTx = bulletLoans.connect(portfolio).createLoan(token.address, parseUSDC(5), parseUSDC(6), YEAR, borrower.address)
    const loanId = await extractLoanId(pendingLoanCreationTx)

    const loanParameters = await bulletLoans.loans(loanId)
    expect(loanParameters.asset).to.equal(token.address)
    expect(loanParameters.status).to.equal(Status.Created)
    expect(loanParameters.principal).to.equal(parseUSDC(5))
    expect(loanParameters.totalDebt).to.equal(parseUSDC(6))
    expect(loanParameters.amountRepaid).to.equal(parseUSDC(0))
    expect(loanParameters.duration).to.equal(YEAR)
    expect(loanParameters.repaymentDate).to.equal(0)
    expect(loanParameters.recipient).to.equal(borrower.address)
  })

  it('loanParameters for non-existent loan are set to 0', async () => {
    const { bulletLoans, createLoan } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()

    const nextId = loanId.add(1)
    const loanParameters = await bulletLoans.loans(nextId)
    expect(loanParameters.asset).to.equal(AddressZero)
    expect(loanParameters.status).to.equal(Status.Created)
    expect(loanParameters.principal).to.equal(parseUSDC(0))
    expect(loanParameters.totalDebt).to.equal(parseUSDC(0))
    expect(loanParameters.amountRepaid).to.equal(parseUSDC(0))
    expect(loanParameters.duration).to.equal(0)
    expect(loanParameters.repaymentDate).to.equal(0)
    expect(loanParameters.recipient).to.equal(AddressZero)
  })

  it('cannot create a loan with totalDebt less than principal', async () => {
    const { bulletLoans, portfolio, token, borrower } = await loadFixture(bulletLoansFixture)

    await expect(bulletLoans.connect(portfolio).createLoan(token.address, parseUSDC(5), parseUSDC(4), YEAR, borrower.address))
      .to.be.revertedWith('BulletLoans: Total debt cannot be less than principal')
  })

  it('emits event', async () => {
    const { bulletLoans, portfolio, token, borrower } = await loadFixture(bulletLoansFixture)
    await expect(bulletLoans.connect(portfolio).createLoan(token.address, parseUSDC(5), parseUSDC(6), YEAR, borrower.address))
      .to.emit(bulletLoans, 'LoanCreated')
      .withArgs(0)
  })
})
