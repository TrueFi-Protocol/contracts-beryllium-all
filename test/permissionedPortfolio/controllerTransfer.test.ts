import { expect } from 'chai'
import { permissionedPortfolioFixture } from 'fixtures/permissionedPortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils/parseUSDC'

describe('PermissionedPortfolio.controllerTransfer', () => {
  const loadFixture = setupFixtureLoader()
  it('forced transfers admin can transfer', async () => {
    const {
      portfolio,
      forcedTransfersAdmin,
      wallet,
      lender,
    } = await loadFixture(permissionedPortfolioFixture)

    await portfolio.connect(forcedTransfersAdmin).controllerTransfer(lender.address, wallet.address, parseUSDC(50_000))

    expect((await portfolio.balanceOf(wallet.address)).toString()).to.eq(parseUSDC(50_000).toString())
  })
  it('non-admin cannot transfer', async () => {
    const {
      portfolio,
      wallet,
      lender,
      another,
    } = await loadFixture(permissionedPortfolioFixture)

    const FORCED_TRANSFERS_ADMIN_ROLE = await portfolio.FORCED_TRANSFERS_ADMIN_ROLE()
    const tx = portfolio.connect(another).controllerTransfer(lender.address, wallet.address, parseUSDC(50_000))

    await expect(tx).to.be.revertedWith(`AccessControl: account ${another.address.toLowerCase()} is missing role ${FORCED_TRANSFERS_ADMIN_ROLE}`)
  })
  it('emits ControllerTransfer event', async () => {
    const {
      portfolio,
      forcedTransfersAdmin,
      wallet,
      lender,
    } = await loadFixture(permissionedPortfolioFixture)

    const tx = portfolio.connect(forcedTransfersAdmin).controllerTransfer(lender.address, wallet.address, parseUSDC(50_000))

    await expect(tx).to.emit(portfolio, 'ControllerTransfer').withNamedArgs({
      _forcedTransfersAdmin: forcedTransfersAdmin.address,
      _from: lender.address,
      _to: wallet.address,
      _value: parseUSDC(50_000),
    })
  })
  it('cannot transfer when portfolio is paused', async () => {
    const {
      portfolio,
      forcedTransfersAdmin,
      wallet,
      lender,
    } = await loadFixture(permissionedPortfolioFixture)

    await portfolio.connect(wallet).pause()
    const tx = portfolio.connect(forcedTransfersAdmin).controllerTransfer(lender.address, wallet.address, parseUSDC(50_000))

    await expect(tx).to.be.revertedWith('Pausable: paused')
  })
})
