import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { setupFixtureLoader } from 'test/setup'
import { DAY, YEAR } from 'utils/constants'
import { flexiblePortfolioFixture } from 'fixtures'

describe('FlexiblePortfolio.setEndDate', () => {
  const loadFixture = setupFixtureLoader()

  it('sets new lower end date', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    const currentEndDate = await portfolio.endDate()
    const newEndDate = currentEndDate.sub(10)
    await portfolio.setEndDate(newEndDate)
    expect(await portfolio.endDate()).to.equal(newEndDate)
  })

  it('cannot set higher end date', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    const currentEndDate = await portfolio.endDate()
    await expect(portfolio.setEndDate(currentEndDate.add(1))).to.be.revertedWith('FP:New endDate too big')
  })

  it('cannot set lower end date than highest instrument end date', async () => {
    const { portfolio, addAndFundBulletLoan, wallet } = await loadFixture(flexiblePortfolioFixture)
    const { txTimestamp } = await addAndFundBulletLoan(BigNumber.from(0), BigNumber.from(0), DAY, wallet)
    const newEndDate = txTimestamp + DAY - 1
    await expect(portfolio.setEndDate(newEndDate)).to.be.revertedWith('FP:New endDate too big')
  })

  it('cannot set new end date after end date elapsed', async () => {
    const { portfolio, timeTravel, portfolioDuration } = await loadFixture(flexiblePortfolioFixture)
    const currentEndDate = await portfolio.endDate()
    await timeTravel(portfolioDuration + 1)
    await expect(portfolio.setEndDate(currentEndDate.add(YEAR))).to.be.revertedWith('FP:End date elapsed')
  })

  it('cannot set timestamp lower than current block timestamp', async () => {
    const { portfolio, getTxTimestamp } = await loadFixture(flexiblePortfolioFixture)
    const txTimestamp = await getTxTimestamp(portfolio.updateAndPayFee())
    await expect(portfolio.setEndDate(txTimestamp)).to.be.revertedWith('FP:New endDate too big')
  })
})
