import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { BulletLoansValuationStrategy__factory, MultiInstrumentValuationStrategy__factory } from 'build'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { AddressZero } from '@ethersproject/constants'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('MultiInstrumentValuationStrategy.addStrategy', () => {
  const loadFixture = setupFixtureLoader()

  const loadEmptyMultiInstrumentValuationStrategyFixture = async () => {
    const fixtureData = await loadFixture(flexiblePortfolioFixture)
    const { wallet, protocolConfig, bulletLoans } = fixtureData

    const valuationStrategy = await deployBehindProxy(new MultiInstrumentValuationStrategy__factory(wallet), protocolConfig.address)
    const bulletLoansValuationStrategy = await deployBehindProxy(new BulletLoansValuationStrategy__factory(wallet), protocolConfig.address, bulletLoans.address, valuationStrategy.address)
    await valuationStrategy.addStrategy(bulletLoans.address, bulletLoansValuationStrategy.address)

    return { ...fixtureData, valuationStrategy }
  }

  it('adds strategy to strategies mapping', async () => {
    const {
      valuationStrategy,
      bulletLoans,
      bulletLoansValuationStrategy,
    } = await loadEmptyMultiInstrumentValuationStrategyFixture()
    await valuationStrategy.addStrategy(bulletLoans.address, bulletLoansValuationStrategy.address)

    expect(await valuationStrategy.strategies(bulletLoans.address)).to.equal(bulletLoansValuationStrategy.address)
  })

  it('adds instrument to supportedInstruments list', async () => {
    const {
      valuationStrategy,
      bulletLoans,
      bulletLoansValuationStrategy,
    } = await loadEmptyMultiInstrumentValuationStrategyFixture()
    await valuationStrategy.addStrategy(bulletLoans.address, bulletLoansValuationStrategy.address)

    expect(await valuationStrategy.getSupportedInstruments()).to.deep.equal([bulletLoans.address])
  })

  it('does not add same instrument twice', async () => {
    const {
      valuationStrategy,
      bulletLoans,
      bulletLoansValuationStrategy,
    } = await loadEmptyMultiInstrumentValuationStrategyFixture()
    await valuationStrategy.addStrategy(bulletLoans.address, bulletLoansValuationStrategy.address)
    await valuationStrategy.addStrategy(bulletLoans.address, bulletLoansValuationStrategy.address)

    expect(await valuationStrategy.getSupportedInstruments()).to.deep.equal([bulletLoans.address])
  })

  it('prevents from adding address 0 strategy', async () => {
    const {
      valuationStrategy,
      bulletLoans,
    } = await loadEmptyMultiInstrumentValuationStrategyFixture()

    await expect(valuationStrategy.addStrategy(bulletLoans.address, AddressZero))
      .to.be.revertedWith('MultiInstrumentValuationStrategy: Cannot add address 0 strategy')
  })

  it('allows only admin to add strategies', async () => {
    const {
      valuationStrategy,
      bulletLoans,
      bulletLoansValuationStrategy,
      other,
      DEFAULT_ADMIN_ROLE,
    } = await loadEmptyMultiInstrumentValuationStrategyFixture()

    await expect(valuationStrategy.connect(other).addStrategy(bulletLoans.address, bulletLoansValuationStrategy.address))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, DEFAULT_ADMIN_ROLE))
  })
})
