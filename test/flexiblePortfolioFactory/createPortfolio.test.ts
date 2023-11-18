import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFactoryFixture } from 'fixtures'
import { YEAR } from 'utils/constants'
import { parseUSDC } from 'utils'
import { extractMinimalProxyImplementationAddress } from 'utils'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolioFactory.createPortfolio', () => {
  const loadFixture = setupFixtureLoader()

  it('reverts if caller does not have manager role', async () => {
    const { another, attemptCreatingPortfolio, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFactoryFixture)
    await expect(attemptCreatingPortfolio(another)).to.be.revertedWith(accessControlMissingRoleRevertMessage(another, MANAGER_ROLE))
  })

  it('reverts if caller has had manager role revoked', async () => {
    const { factory, manager, attemptCreatingPortfolio, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFactoryFixture)

    const tx = await attemptCreatingPortfolio(manager)
    expect((await tx.wait()).status).to.equal(1)

    await factory.revokeRole(MANAGER_ROLE, manager.address)
    await expect(attemptCreatingPortfolio(manager)).to.be.revertedWith(accessControlMissingRoleRevertMessage(manager, MANAGER_ROLE))
  })

  it('sets manager', async () => {
    const { manager, createPortfolio, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()

    expect(await portfolio.hasRole(MANAGER_ROLE, manager.address)).to.be.true
  })

  it('sets asset', async () => {
    const { token, createPortfolio } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()

    expect(await portfolio.asset()).to.equal(token.address)
  })

  it('sets endDate', async () => {
    const { createPortfolio, extractCreationTimestamp } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio, tx } = await createPortfolio()

    const creationTimestamp = await extractCreationTimestamp(tx)
    expect(await portfolio.endDate()).to.equal(creationTimestamp + YEAR)
  })

  it('sets maxSize', async () => {
    const { createPortfolio } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()

    expect(await portfolio.maxSize()).to.equal(parseUSDC(100))
  })

  it('emits event', async () => {
    const { factory, createPortfolio, manager } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio, tx } = await createPortfolio()

    await expect(tx).to.emit(factory, 'PortfolioCreated').withArgs(portfolio.address, manager.address)
  })

  it('sets depositController', async () => {
    const { createPortfolio, depositControllerImplementation } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()
    const usedDepositController = await portfolio.depositController()
    const usedImplementation = await extractMinimalProxyImplementationAddress(usedDepositController)
    expect(usedImplementation).to.equal(depositControllerImplementation.address.toLocaleLowerCase())
  })

  it('sets withdrawController', async () => {
    const { createPortfolio, withdrawControllerImplementation } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()
    const usedWithdrawController = await portfolio.withdrawController()
    const usedImplementation = await extractMinimalProxyImplementationAddress(usedWithdrawController)
    expect(usedImplementation).to.equal(withdrawControllerImplementation.address.toLocaleLowerCase())
  })

  it('sets transferController', async () => {
    const { createPortfolio, transferControllerImplementation } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()
    const usedTransferController = await portfolio.transferController()
    const usedImplementation = await extractMinimalProxyImplementationAddress(usedTransferController)
    expect(usedImplementation).to.equal(transferControllerImplementation.address.toLocaleLowerCase())
  })

  it('sets valuationStrategy', async () => {
    const { createPortfolio, valuationStrategy } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()

    const currentValuationStrategy = await portfolio.valuationStrategy()

    expect(currentValuationStrategy).to.equal(valuationStrategy.address)
  })

  it('sets allowedInstruments', async () => {
    const { createPortfolio, bulletLoans, fixedInterestOnlyLoans } = await loadFixture(flexiblePortfolioFactoryFixture)
    const { portfolio } = await createPortfolio()

    expect(await portfolio.isInstrumentAllowed(bulletLoans.address)).to.be.true
    expect(await portfolio.isInstrumentAllowed(fixedInterestOnlyLoans.address)).to.be.true
  })
})
