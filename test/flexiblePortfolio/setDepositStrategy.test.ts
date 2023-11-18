import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { AddressZero } from '@ethersproject/constants'
import { DepositController__factory } from 'build/types'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.setDepositController', () => {
  const loadFixture = setupFixtureLoader()

  it('removes strategy', async () => {
    const { portfolio, setDepositController } = await loadFixture(flexiblePortfolioFixture)
    await setDepositController(AddressZero)
    expect(await portfolio.depositController()).to.equal(AddressZero)
  })

  it('sets strategy to a new one', async () => {
    const { portfolio, setDepositController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newDepositController = await new DepositController__factory(wallet).deploy()
    await setDepositController(newDepositController.address)
    expect(await portfolio.depositController()).to.equal(newDepositController.address)
  })

  it('can only be set by a strategy admin', async () => {
    const { portfolio, wallet, other, CONTROLLER_ADMIN_ROLE } = await loadFixture(flexiblePortfolioFixture)
    const newDepositController = await new DepositController__factory(wallet).deploy()
    await expect(portfolio.connect(other).setDepositController(newDepositController.address)).to.be.revertedWith(accessControlMissingRoleRevertMessage(other, CONTROLLER_ADMIN_ROLE))
  })

  it('prevents from setting the same strategy', async () => {
    const { portfolio, depositController } = await loadFixture(flexiblePortfolioFixture)

    await expect(portfolio.setDepositController(depositController.address))
      .to.be.revertedWith('FP:Value has to be different')
  })

  it('emits event', async () => {
    const { portfolio, setDepositController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newDepositController = await new DepositController__factory(wallet).deploy()
    await expect(setDepositController(newDepositController.address)).to.emit(portfolio, 'DepositControllerChanged').withArgs(newDepositController.address)
  })
})
