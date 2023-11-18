import { BigNumber } from 'ethers'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils'
import { YEAR } from 'utils/constants'
import { flexiblePortfolioFixture, Status } from 'fixtures'
import { assertEqualArrays } from 'utils/assertEqualArrays'

describe('FlexiblePortfolio.addBulletLoan', () => {
  const loadFixture = setupFixtureLoader()

  it('creates new BulletLoan', async () => {
    const { bulletLoans, other, token, addBulletLoan } = await loadFixture(flexiblePortfolioFixture)

    const principalAmount = parseUSDC(5)
    const repaymentAmount = parseUSDC(6)

    await addBulletLoan(principalAmount, repaymentAmount, YEAR, other)

    assertEqualArrays(await bulletLoans.loans(0), [
      token.address,
      Status.Created,
      BigNumber.from(YEAR),
      BigNumber.from(0),
      other.address,
      principalAmount,
      repaymentAmount,
      BigNumber.from(0),
    ])
  })
})
