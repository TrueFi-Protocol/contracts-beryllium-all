import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC } from 'utils'
import { flexiblePortfolioFixture } from 'fixtures'

describe('FlexiblePortfolio.addFixedInterestOnlyLoan', () => {
  const loadFixture = setupFixtureLoader()
  const principalAmount = parseUSDC(5)
  const periodPaymentAmount = parseUSDC(5)
  const periodsCount = 30
  const periodDuration = DAY * 30

  it('creates new instrument', async () => {
    const { fixedInterestOnlyLoans, another, addFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await addFixedInterestOnlyLoan(principalAmount, periodsCount, periodPaymentAmount, periodDuration, another, DAY)

    expect(await fixedInterestOnlyLoans.principal(0)).to.equal(principalAmount)
    expect(await fixedInterestOnlyLoans.periodCount(0)).to.equal(periodsCount)
    expect(await fixedInterestOnlyLoans.periodPayment(0)).to.equal(periodPaymentAmount)
    expect(await fixedInterestOnlyLoans.periodDuration(0)).to.equal(periodDuration)
    expect(await fixedInterestOnlyLoans.recipient(0)).to.equal(another.address)
    expect(await fixedInterestOnlyLoans.gracePeriod(0)).to.equal(DAY)
  })
})
