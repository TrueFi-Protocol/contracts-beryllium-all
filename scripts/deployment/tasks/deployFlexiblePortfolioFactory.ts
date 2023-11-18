import { contract, reduce } from 'ethereum-mars'
import { FlexiblePortfolio, FlexiblePortfolioFactory, ProtocolConfig } from '../../../build/artifacts'
import { FlexiblePortfolioFactory__factory } from '../../../build'
import { encodeInitializeCall, MarsContract, proxy } from '../utils'
import { Address } from 'ethereum-mars/build/src/symbols'
import { getNameWithPrefix } from '../../utils'

export function deployFlexiblePortfolioFactory(portfolioImplementationContract: MarsContract<typeof FlexiblePortfolio>, protocolConfigContract: MarsContract<typeof ProtocolConfig>, prefix = '') {
  const implementation = contract(getNameWithPrefix(FlexiblePortfolioFactory, prefix), FlexiblePortfolioFactory)
  const initializeCalldata = reduce(
    [protocolConfigContract[Address], portfolioImplementationContract[Address]],
    (protocolConfigImplementation, portfolioImplementation) => encodeInitializeCall(FlexiblePortfolioFactory__factory, portfolioImplementation, protocolConfigImplementation),
  )
  return proxy(implementation, initializeCalldata)
}
