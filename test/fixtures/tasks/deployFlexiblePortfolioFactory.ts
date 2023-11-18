import { FlexiblePortfolioFactory__factory, FlexiblePortfolio__factory, ProtocolConfig } from 'build'
import { Wallet } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'

export async function deployFlexiblePortfolioFactory(protocolOwner: Wallet, manager: Wallet, protocolConfig: ProtocolConfig) {
  const portfolioImplementation = await new FlexiblePortfolio__factory(protocolOwner).deploy()
  const factory = await deployBehindProxy(new FlexiblePortfolioFactory__factory(protocolOwner), portfolioImplementation.address, protocolConfig.address)
  const MANAGER_ROLE = await factory.MANAGER_ROLE()
  await factory.grantRole(MANAGER_ROLE, manager.address)
  return { factory, portfolioImplementation }
}
