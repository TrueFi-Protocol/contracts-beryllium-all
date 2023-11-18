import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { extractArgFromTx, extractMinimalProxyImplementationAddress, getTxTimestamp } from 'utils'
import { FlexiblePortfolio__factory } from 'build/types'

describe('FlexiblePortfolio.initializer', () => {
  const loadFixture = setupFixtureLoader()

  it('name', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.name()).to.equal('Flexible Portfolio')
  })

  it('symbol', async () => {
    const { portfolio } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.symbol()).to.equal('FLEX')
  })

  it('endDate', async () => {
    const { portfolio, provider, portfolioDuration, creationTx } = await loadFixture(flexiblePortfolioFixture)
    const timestamp = await getTxTimestamp(creationTx, provider)
    expect(await portfolio.endDate()).to.equal(timestamp + portfolioDuration)
  })

  it('asset', async () => {
    const { portfolio, token } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.asset()).to.equal(token.address)
  })

  it('maxSize', async () => {
    const { portfolio, maxSize } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.maxSize()).to.equal(maxSize)
  })

  it('protocolConfig', async () => {
    const { portfolio, protocolConfig } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.protocolConfig()).to.equal(protocolConfig.address)
  })

  it('depositController', async () => {
    const { depositControllerImplementation, depositController } = await loadFixture(flexiblePortfolioFixture)
    const usedImplementation = await extractMinimalProxyImplementationAddress(depositController.address)
    expect(usedImplementation).to.equal(depositControllerImplementation.address.toLowerCase())
  })

  it('withdrawController', async () => {
    const { withdrawControllerImplementation, withdrawController } = await loadFixture(flexiblePortfolioFixture)
    const usedImplementation = await extractMinimalProxyImplementationAddress(withdrawController.address)
    expect(usedImplementation).to.equal(withdrawControllerImplementation.address.toLowerCase())
  })

  it('transferController', async () => {
    const { transferControllerImplementation, transferController } = await loadFixture(flexiblePortfolioFixture)
    const usedImplementation = await extractMinimalProxyImplementationAddress(transferController.address)
    expect(usedImplementation).to.equal(transferControllerImplementation.address.toLowerCase())
  })

  it('valuationStrategy', async () => {
    const { portfolio, valuationStrategy } = await loadFixture(flexiblePortfolioFixture)

    const currentValuationStrategy = await portfolio.valuationStrategy()
    expect(currentValuationStrategy).to.equal(valuationStrategy.address)
  })

  it('feeStrategy', async () => {
    const { portfolio, feeStrategy } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.feeStrategy()).to.equal(feeStrategy.address)
  })

  it('managerFeeBeneficiary', async () => {
    const { factory, token, portfolioDuration, maxSize, controllersDeployData, wallet } = await loadFixture(flexiblePortfolioFixture)
    const creationTx = await factory.createPortfolio(token.address,
      portfolioDuration,
      maxSize,
      controllersDeployData,
      [],
      {
        name: 'New Flexible Portfolio',
        symbol: 'NFP',
      })
    const portfolioAddress = await extractArgFromTx(creationTx, [factory.address, 'PortfolioCreated', 'newPortfolio'])
    const portfolio = FlexiblePortfolio__factory.connect(portfolioAddress, wallet)
    expect(await portfolio.managerFeeBeneficiary()).to.equal(wallet.address)
  })

  it('allowedInstruments', async () => {
    const { portfolio, bulletLoans, fixedInterestOnlyLoans } = await loadFixture(flexiblePortfolioFixture)

    expect(await portfolio.isInstrumentAllowed(bulletLoans.address)).to.be.true
    expect(await portfolio.isInstrumentAllowed(fixedInterestOnlyLoans.address)).to.be.true
  })

  it('initializes decimals', async () => {
    const { portfolio, token } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.decimals()).to.equal(await token.decimals())
  })

  it('manager', async () => {
    const { portfolio, wallet, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.hasRole(MANAGER_ROLE, wallet.address)).to.equal(true)
  })

  it('strategy admin', async () => {
    const { portfolio, wallet, CONTROLLER_ADMIN_ROLE } = await loadFixture(flexiblePortfolioFixture)
    expect(await portfolio.hasRole(CONTROLLER_ADMIN_ROLE, wallet.address)).to.equal(true)
  })

  it('prevents from creating portfolio with 0 duration', async () => {
    const { token, factory, maxSize, controllersDeployData, name, symbol } = await loadFixture(flexiblePortfolioFixture)
    await expect(factory.createPortfolio(token.address, 0, maxSize, controllersDeployData, [], { name: name, symbol: symbol }))
      .to.be.revertedWith('FP:Duration can\'t be 0')
  })
})
