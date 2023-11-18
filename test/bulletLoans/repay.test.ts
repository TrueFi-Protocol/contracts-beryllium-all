import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils'
import { bulletLoansFixture } from 'fixtures'

const INVALID_LOAN_ID = 42

describe('BulletLoans.repay', () => {
  const loadFixture = setupFixtureLoader()

  const loadRepayFixture = async () => {
    const bulletLoansFixtureData = await loadFixture(bulletLoansFixture)
    const { createLoan, bulletLoans } = bulletLoansFixtureData
    const loanId = await createLoan()
    await bulletLoans.start(loanId)
    return { ...bulletLoansFixtureData, loanId }
  }

  it('reverts when trying to repay non-existent loan', async () => {
    const { bulletLoans, portfolio } = await loadRepayFixture()
    await expect(bulletLoans.connect(portfolio).repay(INVALID_LOAN_ID, parseUSDC(6)))
      .to.be.revertedWith('ERC721: owner query for nonexistent token')
  })

  it('reverts when trying to repay a loan with status other than Started', async () => {
    const { bulletLoans, portfolio, loanId } = await loadRepayFixture()

    await bulletLoans.connect(portfolio).markAsDefaulted(loanId)
    await expect(bulletLoans.connect(portfolio).repay(loanId, parseUSDC(6)))
      .to.be.revertedWith('BulletLoans: Can only repay started loan')
    await bulletLoans.connect(portfolio).markLoanAsResolved(loanId)
    await expect(bulletLoans.connect(portfolio).repay(loanId, parseUSDC(6)))
      .to.be.revertedWith('BulletLoans: Can only repay started loan')
  })

  it('reverts when trying to overpay a loan', async () => {
    const { bulletLoans, portfolio, loanId } = await loadRepayFixture()

    await expect(bulletLoans.connect(portfolio).repay(loanId, parseUSDC(6).add(1)))
      .to.be.revertedWith('BulletLoans: Loan cannot be overpaid')
  })

  it('emits proper event', async () => {
    const { bulletLoans, portfolio, loanId } = await loadRepayFixture()

    await expect(bulletLoans.connect(portfolio).repay(loanId, parseUSDC(1))).to.emit(bulletLoans, 'LoanRepaid').withArgs(loanId, parseUSDC(1))
  })

  it('decreases unpaid debt', async () => {
    const { bulletLoans, portfolio, loanId } = await loadRepayFixture()

    expect(await bulletLoans.unpaidDebt(0)).to.equal(parseUSDC(6))
    await bulletLoans.connect(portfolio).repay(loanId, parseUSDC(1))
    expect(await bulletLoans.unpaidDebt(0)).to.equal(parseUSDC(5))
    await bulletLoans.connect(portfolio).repay(loanId, parseUSDC(5))
    expect(await bulletLoans.unpaidDebt(0)).to.equal(parseUSDC(0))
  })

  describe('underpayment', () => {
    it('increases amount repaid for loan', async () => {
      const { bulletLoans, portfolio, loanId } = await loadRepayFixture()
      await bulletLoans.connect(portfolio).repay(loanId, parseUSDC(2))
      expect((await bulletLoans.loans(loanId)).amountRepaid).to.equal(parseUSDC(2))
    })
  })

  describe('full repayment', () => {
    it('increases amount repaid for loan', async () => {
      const { bulletLoans, portfolio, loanId } = await loadRepayFixture()

      await bulletLoans.connect(portfolio).repay(loanId, parseUSDC(6))
      expect((await bulletLoans.loans(loanId)).amountRepaid).to.equal(parseUSDC(6))
    })
  })
})
