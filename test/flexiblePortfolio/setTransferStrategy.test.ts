import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { AddressZero } from '@ethersproject/constants'
import { OpenTransferController__factory } from 'build/types'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.setTransferController', () => {
  const loadFixture = setupFixtureLoader()

  it('removes strategy', async () => {
    const { portfolio, setTransferController } = await loadFixture(flexiblePortfolioFixture)
    await setTransferController(AddressZero)
    expect(await portfolio.transferController()).to.equal(AddressZero)
  })

  it('sets strategy to a new one', async () => {
    const { portfolio, setTransferController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newTransferController = await new OpenTransferController__factory(wallet).deploy()
    await setTransferController(newTransferController.address)
    expect(await portfolio.transferController()).to.equal(newTransferController.address)
  })

  it('can only be set by a strategy admin', async () => {
    const { portfolio, wallet, other, CONTROLLER_ADMIN_ROLE } = await loadFixture(flexiblePortfolioFixture)
    const newTransferController = await new OpenTransferController__factory(wallet).deploy()
    await expect(portfolio.connect(other).setTransferController(newTransferController.address)).to.be.revertedWith(accessControlMissingRoleRevertMessage(other, CONTROLLER_ADMIN_ROLE))
  })

  it('prevents from setting the same strategy', async () => {
    const { portfolio, transferController } = await loadFixture(flexiblePortfolioFixture)

    await expect(portfolio.setTransferController(transferController.address))
      .to.be.revertedWith('FP:Value has to be different')
  })

  it('emits event', async () => {
    const { portfolio, setTransferController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const newTransferController = await new OpenTransferController__factory(wallet).deploy()
    await expect(setTransferController(newTransferController.address))
      .to.emit(portfolio, 'TransferControllerChanged')
      .withArgs(newTransferController.address)
  })
})
