import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { AddressZero } from '@ethersproject/constants'
import { IFeeStrategy__factory } from 'build/types'
import { deployMockContract } from 'ethereum-waffle'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.setFeeStrategy', () => {
  const loadFixture = setupFixtureLoader()

  it('removes strategy', async () => {
    const { portfolio, setFeeStrategy } = await loadFixture(flexiblePortfolioFixture)
    await setFeeStrategy(AddressZero)
    expect(await portfolio.feeStrategy()).to.equal(AddressZero)
  })

  it('sets strategy to a new one', async () => {
    const { portfolio, setFeeStrategy, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newFeeStrategy = await deployMockContract(wallet, IFeeStrategy__factory.abi)
    await setFeeStrategy(newFeeStrategy.address)
    expect(await portfolio.feeStrategy()).to.equal(newFeeStrategy.address)
  })

  it('can only be set by a strategy admin', async () => {
    const { portfolio, wallet, other, CONTROLLER_ADMIN_ROLE } = await loadFixture(flexiblePortfolioFixture)
    const newFeeStrategy = await deployMockContract(wallet, IFeeStrategy__factory.abi)
    await expect(portfolio.connect(other).setFeeStrategy(newFeeStrategy.address)).to.be.revertedWith(accessControlMissingRoleRevertMessage(other, CONTROLLER_ADMIN_ROLE))
  })

  it('prevents from setting the same strategy', async () => {
    const { portfolio, feeStrategy } = await loadFixture(flexiblePortfolioFixture)

    await expect(portfolio.setFeeStrategy(feeStrategy.address))
      .to.be.revertedWith('FP:Value has to be different')
  })

  it('emits event', async () => {
    const { portfolio, setFeeStrategy, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newFeeStrategy = await deployMockContract(wallet, IFeeStrategy__factory.abi)
    await expect(setFeeStrategy(newFeeStrategy.address)).to.emit(portfolio, 'FeeStrategyChanged').withArgs(newFeeStrategy.address)
  })
})
