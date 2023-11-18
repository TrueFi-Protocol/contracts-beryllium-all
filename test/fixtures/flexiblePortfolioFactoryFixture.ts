import {
  BulletLoans__factory,
  FlexiblePortfolio__factory,
  MockUsdc__factory,
  FixedInterestOnlyLoans__factory,
  ProtocolConfig__factory,
} from 'contracts'
import { ContractTransaction, Wallet } from 'ethers'
import { extractArgFromTx, parseUSDC } from 'utils'
import { YEAR } from 'utils/constants'
import { protocolFeeRate } from 'config'
import { deployFlexiblePortfolioFactory, deployStrategies } from './tasks'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { MockProvider } from 'ethereum-waffle'

export async function flexiblePortfolioFactoryFixture([protocolOwner, manager]: Wallet[], provider: MockProvider) {
  const protocolConfig = await deployBehindProxy(new ProtocolConfig__factory(protocolOwner), protocolFeeRate, protocolOwner.address, protocolOwner.address, protocolOwner.address)
  const { factory, portfolioImplementation } = await deployFlexiblePortfolioFactory(protocolOwner, manager, protocolConfig)
  const token = await new MockUsdc__factory(protocolOwner).deploy()
  const name = 'Flexible Portfolio'
  const symbol = 'FLEX'
  const managerFeeRate = 100
  const managerFeeBeneficiaryAddress = Wallet.createRandom().address

  const MANAGER_ROLE = await portfolioImplementation.MANAGER_ROLE()
  const PAUSER_ROLE = await portfolioImplementation.PAUSER_ROLE()

  const bulletLoans = await new BulletLoans__factory(protocolOwner).deploy()
  const fixedInterestOnlyLoans = await new FixedInterestOnlyLoans__factory(protocolOwner).deploy()
  const allowedInstruments = [bulletLoans.address, fixedInterestOnlyLoans.address]

  const controllers = await deployStrategies(protocolOwner, bulletLoans, fixedInterestOnlyLoans, protocolConfig)
  const { controllersDeployData } = controllers

  const extractPortfolioAddress = (tx: ContractTransaction) =>
    extractArgFromTx(tx, [factory.address, 'PortfolioCreated', 'newPortfolio'])

  async function extractCreationTimestamp(tx: ContractTransaction) {
    const receipt = await tx.wait()
    const creationTimestamp = (await provider.getBlock(receipt.blockHash)).timestamp
    return creationTimestamp
  }

  function attemptCreatingPortfolio(sender: Wallet, asset = token.address) {
    return factory.connect(sender).createPortfolio(
      asset,
      YEAR,
      parseUSDC(100),
      controllersDeployData,
      allowedInstruments,
      {
        name,
        symbol,
      },
    )
  }

  async function createPortfolio(asset = token.address) {
    const tx = await attemptCreatingPortfolio(manager, asset)
    const portfolioAddress = await extractPortfolioAddress(tx)
    const portfolio = new FlexiblePortfolio__factory(manager).attach(portfolioAddress)
    return { portfolio, tx }
  }

  return {
    factory,
    protocolOwner,
    manager,
    token,
    portfolioImplementation,
    createPortfolio,
    attemptCreatingPortfolio,
    extractCreationTimestamp,
    protocolConfig,
    managerFeeBeneficiaryAddress,
    MANAGER_ROLE,
    PAUSER_ROLE,
    ...controllers,
    bulletLoans,
    fixedInterestOnlyLoans,
    name,
    managerFeeRate,
  }
}
