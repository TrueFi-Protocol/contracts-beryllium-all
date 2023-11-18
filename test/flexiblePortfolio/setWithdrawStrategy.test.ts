import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { AddressZero } from '@ethersproject/constants'
import { WithdrawController__factory } from 'build/types'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.setWithdrawController', () => {
  const loadFixture = setupFixtureLoader()

  it('removes strategy', async () => {
    const { portfolio, setWithdrawController } = await loadFixture(flexiblePortfolioFixture)
    await setWithdrawController(AddressZero)
    expect(await portfolio.withdrawController()).to.equal(AddressZero)
  })

  it('sets strategy to a new one', async () => {
    const { portfolio, setWithdrawController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newWithdrawController = await new WithdrawController__factory(wallet).deploy()
    await setWithdrawController(newWithdrawController.address)
    expect(await portfolio.withdrawController()).to.equal(newWithdrawController.address)
  })

  it('can only be set by a strategy admin', async () => {
    const { portfolio, wallet, other, CONTROLLER_ADMIN_ROLE } = await loadFixture(flexiblePortfolioFixture)
    const newWithdrawController = await new WithdrawController__factory(wallet).deploy()
    await expect(portfolio.connect(other).setWithdrawController(newWithdrawController.address)).to.be.revertedWith(accessControlMissingRoleRevertMessage(other, CONTROLLER_ADMIN_ROLE))
  })

  it('prevents from setting the same strategy', async () => {
    const { portfolio, withdrawController } = await loadFixture(flexiblePortfolioFixture)

    await expect(portfolio.setWithdrawController(withdrawController.address))
      .to.be.revertedWith('FP:Value has to be different')
  })

  it('emits event', async () => {
    const { portfolio, setWithdrawController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newWithdrawController = await new WithdrawController__factory(wallet).deploy()
    await expect(setWithdrawController(newWithdrawController.address))
      .to.emit(portfolio, 'WithdrawControllerChanged')
      .withArgs(newWithdrawController.address)
  })
})
