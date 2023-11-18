import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { expect } from 'chai'
import { DAY, parseUSDC } from 'utils'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

const principalAmount = parseUSDC(5)
const periodPaymentAmount = parseUSDC(5)
const periodsCount = 12
const periodDuration = DAY * 30

describe('FlexiblePortfolio.markInstrumentAsDefaulted', () => {
  const loadFixture = setupFixtureLoader()

  it('can only be called by the manager', async () => {
    const { portfolio, other, fixedInterestOnlyLoans, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)

    await expect(portfolio.connect(other).markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, MANAGER_ROLE))
  })

  it('changes fixed interest only loans status to "Defaulted"', async () => {
    const { portfolio, addAcceptFundFixedInterestOnlyLoan, fixedInterestOnlyLoans, borrower, FixedInterestOnlyLoanStatus, deposit, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(principalAmount)
    const { loanId } = await addAcceptFundFixedInterestOnlyLoan(principalAmount, periodsCount, periodPaymentAmount, periodDuration, borrower, DAY)

    await timeTravel(periodDuration + DAY + 1)
    await portfolio.markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, loanId)

    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Defaulted)
  })

  it('triggers update of valuation strategy', async () => {
    const { portfolio, addAcceptFundFixedInterestOnlyLoan, fixedInterestOnlyLoans, borrower, deposit, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(principalAmount)
    const { loanId } = await addAcceptFundFixedInterestOnlyLoan(principalAmount, periodsCount, periodPaymentAmount, periodDuration, borrower, DAY)

    await timeTravel(periodDuration + DAY + 1)
    expect(await portfolio.totalAssets()).to.be.closeTo(principalAmount.add(periodPaymentAmount).add(periodPaymentAmount.div(30)), parseUSDC(0.01))

    await portfolio.markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, loanId)
    expect(await portfolio.totalAssets()).to.equal(0)
  })
})
