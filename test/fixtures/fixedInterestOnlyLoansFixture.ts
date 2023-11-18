import { FixedInterestOnlyLoans__factory, MockUsdc__factory, ProtocolConfig__factory } from 'build/types'
import { BigNumber, Wallet } from 'ethers'
import { DAY, parseUSDC, timeTravel as _timeTravel } from 'utils'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { protocolFeeRate } from 'config'
import { MockProvider } from 'ethereum-waffle'

enum FixedInterestOnlyLoanStatus {
  Created,
  Accepted,
  Started,
  Repaid,
  Cancelled,
  Defaulted
}

export async function fixedInterestOnlyLoansFixture([owner, borrower]: Wallet[], provider: MockProvider) {
  const protocolConfig = await deployBehindProxy(new ProtocolConfig__factory(owner), protocolFeeRate, owner.address, owner.address, owner.address)
  const fixedInterestOnlyLoans = await deployBehindProxy(new FixedInterestOnlyLoans__factory(owner), protocolConfig.address)

  const DEFAULT_ADMIN_ROLE = await fixedInterestOnlyLoans.DEFAULT_ADMIN_ROLE()
  const PAUSER_ROLE = await fixedInterestOnlyLoans.PAUSER_ROLE()

  const token = await new MockUsdc__factory(owner).deploy()
  await token.mint(owner.address, parseUSDC(100))

  const defaultLoanParams = {
    asset: token.address,
    principal: parseUSDC(100),
    periodCount: 4,
    periodPayment: parseUSDC(10),
    periodDuration: 30 * DAY,
    recipient: borrower.address,
    gracePeriod: 3 * DAY,
    canBeRepaidAfterDefault: false,
  }

  const issueLoan = () => fixedInterestOnlyLoans.issueLoan(
    defaultLoanParams.asset,
    defaultLoanParams.principal,
    defaultLoanParams.periodCount,
    defaultLoanParams.periodPayment,
    defaultLoanParams.periodDuration,
    defaultLoanParams.recipient,
    defaultLoanParams.gracePeriod,
    defaultLoanParams.canBeRepaidAfterDefault,
  )

  const fundLoan = async (loanId: number, amount: BigNumber = parseUSDC(100)) => {
    await token.transfer(await fixedInterestOnlyLoans.recipient(loanId), amount)
    await fixedInterestOnlyLoans.start(loanId)
  }

  const repayLoan = (loanId: number, amount: BigNumber = parseUSDC(10)) => fixedInterestOnlyLoans.repay(loanId, amount)

  const acceptLoan = (id: number) => fixedInterestOnlyLoans.connect(borrower).acceptLoan(id)

  const issueAndStart = async (id = 0) => {
    await issueLoan()
    await acceptLoan(id)
    await fundLoan(id)
  }

  const cancelLoan = (id: number) => fixedInterestOnlyLoans.connect(owner).cancel(id)
  const markLoanAsDefaulted = (id: number) => fixedInterestOnlyLoans.connect(owner).markAsDefaulted(id)

  const timeTravel = (time: number) => _timeTravel(provider, time)

  return { fixedInterestOnlyLoans, owner, borrower, DEFAULT_ADMIN_ROLE, PAUSER_ROLE, token, defaultLoanParams, issueLoan, fundLoan, repayLoan, acceptLoan, markLoanAsDefaulted, FixedInterestOnlyLoanStatus, cancelLoan, issueAndStart, timeTravel }
}
