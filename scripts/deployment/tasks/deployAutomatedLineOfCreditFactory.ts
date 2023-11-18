import { contract, reduce } from 'ethereum-mars'
import { AutomatedLineOfCreditFactory } from '../../../build/artifacts'
import { AutomatedLineOfCreditFactory__factory } from '../../../build/types/factories/contracts'
import { encodeInitializeCall, proxy, MarsContract } from '../utils'
import { Address } from 'ethereum-mars/build/src/symbols'
import { getNameWithPrefix } from '../../utils'

export function deployAutomatedLineOfCreditFactory(portfolioImplementationContract: MarsContract, protocolConfigContract: MarsContract, prefix = '') {
  const implementation = contract(getNameWithPrefix(AutomatedLineOfCreditFactory, prefix), AutomatedLineOfCreditFactory)
  const initializeCalldata = reduce(
    [protocolConfigContract[Address], portfolioImplementationContract[Address]],
    (protocolConfig, portfolioImplementation) => encodeInitializeCall(AutomatedLineOfCreditFactory__factory, portfolioImplementation, protocolConfig),
  )
  return proxy(implementation, initializeCalldata)
}
