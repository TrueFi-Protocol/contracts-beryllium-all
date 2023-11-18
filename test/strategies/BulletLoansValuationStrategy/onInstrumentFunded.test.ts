import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { bulletLoansValuationStrategyFixture } from 'fixtures'

describe('BulletLoansValuationStrategy.onInstrumentFunded', () => {
  const loadFixture = setupFixtureLoader()

  it('adds instrumentId to bulletLoans mapping', async () => {
    const { bulletLoans, valuationStrategy, portfolio, parentStrategy } = await loadFixture(bulletLoansValuationStrategyFixture)

    await valuationStrategy.connect(parentStrategy).onInstrumentFunded(portfolio.address, bulletLoans.address, 0)
    const currentBulletLoans = await valuationStrategy.getBulletLoans(portfolio.address)

    expect(currentBulletLoans).to.have.length(1)
    expect(currentBulletLoans[0]).to.equal(0)
  })

  it('reverts on invalid instrument type', async () => {
    const { valuationStrategy, wallet, parentStrategy, portfolio } = await loadFixture(bulletLoansValuationStrategyFixture)

    await expect(valuationStrategy.connect(parentStrategy).onInstrumentFunded(portfolio.address, wallet.address, 0))
      .to.be.revertedWith('BulletLoansValuationStrategy: Unexpected instrument')
  })

  it('emits an event', async () => {
    const { bulletLoans, valuationStrategy, parentStrategy, portfolio } = await loadFixture(bulletLoansValuationStrategyFixture)

    await expect(valuationStrategy.connect(parentStrategy).onInstrumentFunded(portfolio.address, bulletLoans.address, 0))
      .to.emit(valuationStrategy, 'InstrumentAdded')
      .withArgs(portfolio.address, bulletLoans.address, 0)
  })

  it('msg.sender can add loan for himself', async () => {
    const { bulletLoans, valuationStrategy, wallet } = await loadFixture(bulletLoansValuationStrategyFixture)

    await valuationStrategy.onInstrumentFunded(wallet.address, bulletLoans.address, 0)
    const currentBulletLoans = await valuationStrategy.getBulletLoans(wallet.address)

    expect(currentBulletLoans).to.have.length(1)
    expect(currentBulletLoans[0]).to.equal(0)
  })

  it('only a parent strategy can add loans', async () => {
    const { bulletLoans, valuationStrategy, portfolio } = await loadFixture(bulletLoansValuationStrategyFixture)

    await expect(valuationStrategy.onInstrumentFunded(portfolio.address, bulletLoans.address, 0))
      .to.be.revertedWith('BulletLoansValuationStrategy: Only portfolio or parent strategy')
  })
})
