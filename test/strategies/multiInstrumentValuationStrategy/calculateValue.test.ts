import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { DAY, parseUSDC } from 'utils'

describe('MultiInstrumentValuationStrategy.calculateValue', () => {
  const loadFixture = setupFixtureLoader()

  it('sums over all instruments and returns their value', async () => {
    const { deposit, portfolio, addAndFundBulletLoan, borrower, valuationStrategy, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(100))
    await addAndFundBulletLoan(parseUSDC(100), parseUSDC(110), DAY, borrower)

    expect(await valuationStrategy.calculateValue(portfolio.address)).to.be.closeTo(parseUSDC(100), parseUSDC(0.0001))

    await timeTravel(DAY)
    expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(parseUSDC(110))
  })

  it('does not add liquid funds to total value', async () => {
    const { deposit, portfolio, addAndFundBulletLoan, borrower, valuationStrategy } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(50))
    await addAndFundBulletLoan(parseUSDC(50), parseUSDC(50), DAY, borrower)
    await deposit(parseUSDC(20))

    expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(parseUSDC(50))
  })
})
