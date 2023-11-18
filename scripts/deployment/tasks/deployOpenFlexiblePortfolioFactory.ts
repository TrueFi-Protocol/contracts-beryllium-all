import { contract, reduce } from 'ethereum-mars'
import { FlexiblePortfolio, OpenFlexiblePortfolioFactory, ProtocolConfig } from '../../../build/artifacts'
import { OpenFlexiblePortfolioFactory__factory } from '../../../build'
import { encodeInitializeCall, MarsContract, proxy } from '../utils'
import { Address } from 'ethereum-mars/build/src/symbols'

export function deployOpenFlexiblePortfolioFactory(portfolioImplementationContract: MarsContract<typeof FlexiblePortfolio>, protocolConfigContract: MarsContract<typeof ProtocolConfig>, prefix = '') {
  const implementation = contract(`${prefix}flexiblePortfolioFactory`, OpenFlexiblePortfolioFactory)
  const initializeCalldata = reduce(
    [protocolConfigContract[Address], portfolioImplementationContract[Address]],
    (protocolConfigImplementation, portfolioImplementation) => encodeInitializeCall(OpenFlexiblePortfolioFactory__factory, portfolioImplementation, protocolConfigImplementation),
  )
  return proxy(implementation, initializeCalldata)
}
