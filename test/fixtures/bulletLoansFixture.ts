import { BulletLoans__factory, MockUsdc__factory } from 'build/types'
import { ContractTransaction, Wallet } from 'ethers'
import { extractArgFromTx, parseUSDC, YEAR } from 'utils'

export enum Status {
  Created,
  Started,
  FullyRepaid,
  Defaulted,
  Resolved,
  Cancelled
}

export async function bulletLoansFixture([owner, portfolio, borrower]: Wallet[]) {
  const bulletLoans = await new BulletLoans__factory(owner).deploy()
  const token = await new MockUsdc__factory(owner).deploy()
  await token.mint(borrower.address, parseUSDC(100))
  await token.connect(borrower).approve(bulletLoans.address, parseUSDC(1e10))

  function extractLoanId(pendingTx: Promise<ContractTransaction>) {
    return extractArgFromTx(pendingTx, [bulletLoans.address, 'LoanCreated', 'instrumentId'])
  }

  function createLoan() {
    const createLoanTx = bulletLoans.connect(portfolio).createLoan(token.address, parseUSDC(5), parseUSDC(6), YEAR, borrower.address)
    return extractLoanId(createLoanTx)
  }

  return { bulletLoans, owner, portfolio, borrower, token, extractLoanId, createLoan }
}
