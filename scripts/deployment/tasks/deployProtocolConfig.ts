import { contract } from 'ethereum-mars'
import { ProtocolConfig } from '../../../build/artifacts'
import { ProtocolConfig__factory } from '../../../build/types'
import { encodeInitializeCall, proxy } from '../utils'
import { config } from '../config'
import { getNameWithPrefix } from '../../utils'

export function deployProtocolConfig(networkName: string, prefix = '') {
  const { protocolFee, protocolAdmin, protocolTreasury, pauserAddress } = config.protocolConfig[networkName] ?? config.protocolConfig.mainnet
  const implementation = contract(getNameWithPrefix(ProtocolConfig, prefix), ProtocolConfig)
  const initializeCallData = encodeInitializeCall(ProtocolConfig__factory, protocolFee, protocolAdmin, protocolTreasury, pauserAddress)
  return proxy(implementation, initializeCallData)
}
