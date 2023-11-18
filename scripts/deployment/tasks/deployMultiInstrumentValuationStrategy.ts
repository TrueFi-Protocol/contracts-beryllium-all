import { contract } from 'ethereum-mars'
import { MultiInstrumentValuationStrategy } from '../../../build/artifacts'
import { MultiInstrumentValuationStrategy__factory } from '../../../build'
import { encodeInitializeCall, proxy, MarsContract } from '../utils'
import { Address } from 'ethereum-mars/build/src/symbols'
import { getNameWithPrefix } from '../../utils'

export function deployMultiInstrumentValuationStrategy(protocolConfigContract: MarsContract, prefix = '') {
  const implementation = contract(getNameWithPrefix(MultiInstrumentValuationStrategy, prefix), MultiInstrumentValuationStrategy)
  const initializeCalldata = protocolConfigContract[Address].map(protocolConfig => {
    return encodeInitializeCall(MultiInstrumentValuationStrategy__factory, protocolConfig)
  })
  return proxy(implementation, initializeCalldata)
}
