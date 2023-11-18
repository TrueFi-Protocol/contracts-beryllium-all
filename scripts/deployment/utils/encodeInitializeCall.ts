import { ContractFactory } from 'ethers'
import { constants } from 'ethers'
import { Class } from '.'

export const encodeInitializeCall =
  <T extends Class<ContractFactory>>(factory: T, ...args: Parameters<ReturnType<T['connect']>['initialize']>) =>
    factory.connect(constants.AddressZero, null).interface.encodeFunctionData('initialize', args)
