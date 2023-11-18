import { expect } from 'chai'
import { constants } from 'ethers'
import { permissionedPortfolioFactoryFixture } from 'fixtures'
import { setupFixtureLoader } from 'test/setup'

describe('PermissionedPortfolioFactory.createPortfolio', () => {
  const loadFixture = setupFixtureLoader()

  it('cannot create portfolio before default forced transfers admin is set', async () => {
    const {
      createPortfolio,
    } = await loadFixture(permissionedPortfolioFactoryFixture)

    const createPromise = createPortfolio()

    await expect(createPromise).to.be.revertedWith('PPF: Default forced transfers admin admin is not set')
  })

  it('cannot set default forced transfers admin to address 0', async () => {
    const {
      setDefaultForcedTransfersAdmin,
    } = await loadFixture(permissionedPortfolioFactoryFixture)

    const tx = setDefaultForcedTransfersAdmin(constants.AddressZero)

    await expect(tx).to.be.revertedWith('PPF: Default forced transfers admin cannot be address 0')
  })

  it('only protocol owner can set default forced transfers admin', async () => {
    const {
      factory,
      other,
    } = await loadFixture(permissionedPortfolioFactoryFixture)
    const DEFAULT_ADMIN_ROLE = await factory.DEFAULT_ADMIN_ROLE()

    const tx = factory.connect(other).setDefaultForcedTransfersAdmin(constants.AddressZero)

    await expect(tx).to.be.revertedWith(`AccessControl: account ${other.address.toLowerCase()} is missing role ${DEFAULT_ADMIN_ROLE}`)
  })

  it('creates portfolio', async () => {
    const {
      setDefaultForcedTransfersAdmin,
      createPortfolio,
      other,
    } = await loadFixture(permissionedPortfolioFactoryFixture)

    await setDefaultForcedTransfersAdmin(other.address)
    await createPortfolio()
  })

  it('created portfolio has forced transfers admin set to default', async () => {
    const {
      setDefaultForcedTransfersAdmin,
      createPortfolio,
      wallet,
      other,
    } = await loadFixture(permissionedPortfolioFactoryFixture)

    await setDefaultForcedTransfersAdmin(wallet.address)
    const { portfolio } = await createPortfolio()
    const FORCED_TRANSFERS_ADMIN_ROLE = await portfolio.FORCED_TRANSFERS_ADMIN_ROLE()

    expect(await portfolio.hasRole(FORCED_TRANSFERS_ADMIN_ROLE, wallet.address)).to.be.true
    expect(await portfolio.hasRole(FORCED_TRANSFERS_ADMIN_ROLE, other.address)).to.be.false
  })

  it('can change default forced transfers admin', async () => {
    const {
      setDefaultForcedTransfersAdmin,
      createPortfolio,
      other,
      another,
    } = await loadFixture(permissionedPortfolioFactoryFixture)

    await setDefaultForcedTransfersAdmin(other.address)
    const { portfolio: portfolio1 } = await createPortfolio()
    const FORCED_TRANSFERS_ADMIN_ROLE = await portfolio1.FORCED_TRANSFERS_ADMIN_ROLE()

    await setDefaultForcedTransfersAdmin(another.address)
    const { portfolio: portfolio2 } = await createPortfolio()

    expect(await portfolio1.hasRole(FORCED_TRANSFERS_ADMIN_ROLE, other.address)).to.be.true
    expect(await portfolio1.hasRole(FORCED_TRANSFERS_ADMIN_ROLE, another.address)).to.be.false
    expect(await portfolio2.hasRole(FORCED_TRANSFERS_ADMIN_ROLE, other.address)).to.be.false
    expect(await portfolio2.hasRole(FORCED_TRANSFERS_ADMIN_ROLE, another.address)).to.be.true
  })

  it('cannot set default forced transfers admin to its current value', async () => {
    const {
      setDefaultForcedTransfersAdmin,
      other,
    } = await loadFixture(permissionedPortfolioFactoryFixture)

    await setDefaultForcedTransfersAdmin(other.address)
    const tx = setDefaultForcedTransfersAdmin(other.address)

    await expect(tx).to.be.revertedWith('PPF: Default forced transfers admin cannot be set to its current value')
  })

  it('reverts creating portfolio with duration time 0', async () => {
    const {
      createPortfolio,
      token,
      setDefaultForcedTransfersAdmin,
      other,
    } = await loadFixture(permissionedPortfolioFactoryFixture)
    await setDefaultForcedTransfersAdmin(other.address)

    const tx = createPortfolio(token.address, 0)

    await expect(tx).to.be.revertedWith('FP:Duration can\'t be 0')
  })
})
