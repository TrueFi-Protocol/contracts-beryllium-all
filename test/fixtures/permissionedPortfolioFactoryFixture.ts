import { BulletLoans__factory, FixedInterestOnlyLoans__factory, MockUsdc__factory, OpenTransferController__factory, PermissionedPortfolio__factory, ProtocolConfig__factory } from 'build'
import { protocolFeeRate } from 'config'
import { MockProvider } from 'ethereum-waffle'
import { ContractTransaction, Wallet } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { extractArgFromTx, parseUSDC, YEAR } from 'utils'
import { deployPermissionedPortfolioFactory, deployStrategies } from './tasks'

export async function permissionedPortfolioFactoryFixture([protocolOwner, manager]: Wallet[], provider: MockProvider) {
  const protocolConfig = await deployBehindProxy(new ProtocolConfig__factory(protocolOwner), protocolFeeRate, protocolOwner.address, protocolOwner.address, protocolOwner.address)
  const { factory, portfolioImplementation } = await deployPermissionedPortfolioFactory(protocolOwner, manager, protocolConfig)
  const token = await new MockUsdc__factory(protocolOwner).deploy()
  const name = 'Permissioned Portfolio'
  const symbol = 'PePo'

  const bulletLoans = await new BulletLoans__factory(protocolOwner).deploy()
  const fixedInterestOnlyLoans = await new FixedInterestOnlyLoans__factory(protocolOwner).deploy()
  const allowedInstruments = [bulletLoans.address, fixedInterestOnlyLoans.address]

  const { controllersDeployData } = await deployStrategies(protocolOwner, bulletLoans, fixedInterestOnlyLoans, protocolConfig)
  const transferController = await new OpenTransferController__factory(protocolOwner).deploy()

  const extractPortfolioAddress = (tx: ContractTransaction) =>
    extractArgFromTx(tx, [factory.address, 'PortfolioCreated', 'newPortfolio'])

  function attemptCreatingPortfolio(sender: Wallet, asset = token.address, duration = YEAR) {
    return factory.connect(sender).createPortfolio(
      asset,
      duration,
      parseUSDC(100_000_000),
      {
        ...controllersDeployData,
        transferControllerImplementation: transferController.address,
        transferControllerInitData: transferController.interface.encodeFunctionData('initialize'),
      },
      allowedInstruments,
      {
        name,
        symbol,
      },
    )
  }

  async function createPortfolio(asset = token.address, duration = YEAR) {
    const tx = await attemptCreatingPortfolio(manager, asset, duration)
    const portfolioAddress = await extractPortfolioAddress(tx)
    const portfolio = new PermissionedPortfolio__factory(manager).attach(portfolioAddress)
    return { portfolio, tx }
  }

  function setDefaultForcedTransfersAdmin(forcedTransfersAdmin: string) {
    return factory.connect(protocolOwner).setDefaultForcedTransfersAdmin(forcedTransfersAdmin)
  }

  return {
    token,
    factory,
    portfolioImplementation,
    createPortfolio,
    setDefaultForcedTransfersAdmin,
  }
}
