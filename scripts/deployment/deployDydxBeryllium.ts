import { contract, ExecuteOptions } from 'ethereum-mars'
import { deployProtocolConfig } from './tasks'
import {
  deployAutomatedLineOfCreditFactory,
} from './tasks'
import {
  AutomatedLineOfCredit,
  MultiFarmAllowedTransferController,
} from '../../build/artifacts'
import { getNameWithPrefix } from '../utils'
import { dydxConfig } from './dydxConfig'

export function deployDydxBeryllium(deployer: string, { networkName }: ExecuteOptions, prefix = '') {
  const protocolConfig = deployProtocolConfig(networkName, prefix)
  const dydxFarmAllowedTransferController = contract(getNameWithPrefix(MultiFarmAllowedTransferController, prefix + 'dydx_'), MultiFarmAllowedTransferController, [])
  dydxFarmAllowedTransferController.initialize(dydxConfig.dydxFarm[networkName])
  const automatedLineOfCreditImplementation = contract(getNameWithPrefix(AutomatedLineOfCredit, prefix), AutomatedLineOfCredit)
  const dydxAutomatedLineOfCreditFactory = deployAutomatedLineOfCreditFactory(automatedLineOfCreditImplementation, protocolConfig, prefix + 'dydx_')

  const isTestnet = networkName !== 'mainnet' && networkName !== 'optimism'

  if (isTestnet) {
    dydxAutomatedLineOfCreditFactory.grantRole(dydxAutomatedLineOfCreditFactory.MANAGER_ROLE(), deployer)
  }

  return {
    protocolConfig,
    automatedLineOfCreditImplementation,
    dydxAutomatedLineOfCreditFactory,
    dydxFarmAllowedTransferController,
  }
}
