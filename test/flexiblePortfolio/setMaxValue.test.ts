import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { parseUSDC } from 'utils/parseUSDC'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.setMaxSize', () => {
  const loadFixture = setupFixtureLoader()

  it('lets manager update max size', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.setMaxSize(parseUSDC(1_000_000))
    expect(await portfolio.maxSize()).to.equal(parseUSDC(1_000_000))
  })

  it('prevents non-manager from updating max size', async () => {
    const { portfolio, other, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.connect(other).setMaxSize(parseUSDC(1_000_000))).to.be.revertedWith(accessControlMissingRoleRevertMessage(other, MANAGER_ROLE))
  })

  it('prevents from setting the same size', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    const previousMaxSize = await portfolio.maxSize()

    await expect(portfolio.setMaxSize(previousMaxSize))
      .to.be.revertedWith('FP:Value has to be different')
  })

  it('emits event', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    const maxSize = parseUSDC(1_000_000)
    await expect(portfolio.setMaxSize(maxSize)).to.emit(portfolio, 'MaxSizeChanged').withArgs(maxSize)
  })
})
