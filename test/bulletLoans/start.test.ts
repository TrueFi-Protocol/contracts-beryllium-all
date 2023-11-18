import { BigNumber } from 'ethers'
import { setupFixtureLoader } from 'test/setup'
import { YEAR } from 'utils/constants'
import { getTxTimestamp } from 'utils/getTxTimestamp'
import { parseUSDC } from 'utils/parseUSDC'
import { bulletLoansFixture, Status } from 'fixtures'
import { assertEqualArrays } from 'utils/assertEqualArrays'

describe('BulletLoans.start', () => {
  const loadFixture = setupFixtureLoader()

  it('updates endDate and status', async () => {
    const { bulletLoans, createLoan, token, borrower, provider } = await loadFixture(bulletLoansFixture)
    const loanId = await createLoan()
    assertEqualArrays(await bulletLoans.loans(loanId), [
      token.address,
      Status.Created,
      BigNumber.from(YEAR),
      BigNumber.from(0),
      borrower.address,
      parseUSDC(5),
      parseUSDC(6),
      BigNumber.from(0),
    ])

    const tx = await bulletLoans.start(loanId)
    const blockTimestamp = await getTxTimestamp(tx, provider)
    assertEqualArrays(await bulletLoans.loans(loanId), [
      token.address,
      Status.Started,
      BigNumber.from(YEAR),
      BigNumber.from(blockTimestamp + YEAR),
      borrower.address,
      parseUSDC(5),
      parseUSDC(6),
      BigNumber.from(0),
    ])
  })
})
