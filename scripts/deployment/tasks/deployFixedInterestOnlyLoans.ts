import { contract } from 'ethereum-mars'
import { FixedInterestOnlyLoans } from '../../../build/artifacts'
import { FixedInterestOnlyLoans__factory } from '../../../build/types'
import { encodeInitializeCall, proxy, MarsContract } from '../utils'
import { Address } from 'ethereum-mars/build/src/symbols'
import { getNameWithPrefix } from '../../utils'

export function deployFixedInterestOnlyLoans(protocolConfigContract: MarsContract, prefix = '') {
  const implementation = contract(getNameWithPrefix(FixedInterestOnlyLoans, prefix), FixedInterestOnlyLoans)
  const initializeCalldata = protocolConfigContract[Address].map(protocolConfig => {
    return encodeInitializeCall(FixedInterestOnlyLoans__factory, protocolConfig)
  })
  return proxy(implementation, initializeCalldata)
}
