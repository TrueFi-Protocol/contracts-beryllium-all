import { contract, reduce } from 'ethereum-mars'
import { FixedInterestOnlyLoansValuationStrategy } from '../../../build/artifacts'
import { FixedInterestOnlyLoansValuationStrategy__factory } from '../../../build'
import { encodeInitializeCall, proxy, MarsContract } from '../utils'
import { Address } from 'ethereum-mars/build/src/symbols'
import { getNameWithPrefix } from '../../utils'

export function deployFIOLValuationStrategy(
  protocolConfig: MarsContract,
  fixedInterestOnlyLoans: MarsContract,
  parentStrategy: MarsContract,
  prefix = '',
) {
  const implementation = contract(getNameWithPrefix(FixedInterestOnlyLoansValuationStrategy, prefix), FixedInterestOnlyLoansValuationStrategy)
  const initializeCalldata = reduce(
    [protocolConfig[Address], fixedInterestOnlyLoans[Address], parentStrategy[Address]],
    (protocolConfig, fixedInterestOnlyLoans, parentStrategy) =>
      encodeInitializeCall(
        FixedInterestOnlyLoansValuationStrategy__factory,
        protocolConfig,
        fixedInterestOnlyLoans,
        parentStrategy,
      ))
  return proxy(implementation, initializeCalldata)
}
