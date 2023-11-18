import { PermissionedPortfolio__factory, PermissionedPortfolioFactory__factory, ProtocolConfig } from 'build'
import { Wallet } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'

export async function deployPermissionedPortfolioFactory(protocolOwner: Wallet, manager: Wallet, protocolConfig: ProtocolConfig) {
  const portfolioImplementation = await new PermissionedPortfolio__factory(protocolOwner).deploy()
  const factory = await deployBehindProxy(new PermissionedPortfolioFactory__factory(protocolOwner), portfolioImplementation.address, protocolConfig.address)
  const MANAGER_ROLE = await factory.MANAGER_ROLE()
  await factory.grantRole(MANAGER_ROLE, manager.address)
  return { factory, portfolioImplementation }
}
