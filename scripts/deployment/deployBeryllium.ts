import { contract, ExecuteOptions, Future } from 'ethereum-mars'
import { deployProtocolConfig } from './tasks'
import {
  deployAutomatedLineOfCreditFactory,
  deployFixedInterestOnlyLoans,
  deployFlexiblePortfolioFactory,
  deployMultiInstrumentValuationStrategy,
  deployFIOLValuationStrategy,
} from './tasks'
import {
  AutomatedLineOfCredit,
  DepositController,
  FeeStrategy,
  FlexiblePortfolio,
  MockUsdc,
  BlockedTransferController,
  OpenTransferController,
  MultiFarmAllowedTransferController,
  WithdrawController,
  AllowAllLenderVerifier,
  GlobalWhitelistLenderVerifierWrapper,
  GlobalWhitelistLenderVerifier,
  WithdrawOncePortfolioIsClosedController,
} from '../../build/artifacts'
import { getNameWithPrefix, readContractAddress } from '../utils'
import { makeContractInstance } from 'ethereum-mars/build/src/syntax/contract'
import { config } from './config'
import { deployOpenFlexiblePortfolioFactory } from './tasks/deployOpenFlexiblePortfolioFactory'

export function deployBeryllium(deployer: string, { networkName, deploymentsFile }: ExecuteOptions, prefix = '') {
  const isTestnet = networkName !== 'mainnet' && networkName !== 'optimism'

  const protocolConfig = deployProtocolConfig(networkName, prefix)

  const depositController = contract(getNameWithPrefix(DepositController, prefix), DepositController)
  const blockedTransferController = contract(getNameWithPrefix(BlockedTransferController, prefix), BlockedTransferController)
  const openTransferController = contract(getNameWithPrefix(OpenTransferController, prefix), OpenTransferController)
  const multiFarmAllowedTransferController = contract(getNameWithPrefix(MultiFarmAllowedTransferController, prefix), MultiFarmAllowedTransferController, [])
  const withdrawController = contract(getNameWithPrefix(WithdrawController, prefix), WithdrawController)
  const withdrawOncePortfolioIsClosedController = contract(getNameWithPrefix(WithdrawOncePortfolioIsClosedController, prefix), WithdrawOncePortfolioIsClosedController)

  const allowAllLenderVerifier = contract(getNameWithPrefix(AllowAllLenderVerifier, prefix), AllowAllLenderVerifier)
  const globalWhitelistLenderVerifier = contract(GlobalWhitelistLenderVerifier)
  const globalWhitelistLenderVerifierWrapper = contract(getNameWithPrefix(GlobalWhitelistLenderVerifierWrapper, prefix), GlobalWhitelistLenderVerifierWrapper, [globalWhitelistLenderVerifier])

  const feeStrategy = contract(getNameWithPrefix(FeeStrategy, prefix), FeeStrategy, [])

  const automatedLineOfCreditImplementation = contract(getNameWithPrefix(AutomatedLineOfCredit, prefix), AutomatedLineOfCredit)
  const automatedLineOfCreditFactory = deployAutomatedLineOfCreditFactory(automatedLineOfCreditImplementation, protocolConfig, prefix)

  const fixedInterestOnlyLoans = deployFixedInterestOnlyLoans(protocolConfig, prefix)
  const flexiblePortfolio = contract(getNameWithPrefix(FlexiblePortfolio, prefix), FlexiblePortfolio)
  const flexiblePortfolioFactory = isTestnet
    ? deployOpenFlexiblePortfolioFactory(flexiblePortfolio, protocolConfig, prefix)
    : deployFlexiblePortfolioFactory(flexiblePortfolio, protocolConfig, prefix)

  const valuationStrategy = deployMultiInstrumentValuationStrategy(protocolConfig, prefix)
  const fiolValuationStrategy = deployFIOLValuationStrategy(protocolConfig, fixedInterestOnlyLoans, valuationStrategy, prefix)
  valuationStrategy.addStrategy(fixedInterestOnlyLoans, fiolValuationStrategy)

  const deployTestnetContracts = () => {
    const usdcAddress = readContractAddress(deploymentsFile, networkName, 'mockUsdc')
    const usdc = makeContractInstance('mockUsdc', MockUsdc, new Future(() => usdcAddress))

    flexiblePortfolioFactory.grantRole(flexiblePortfolioFactory.MANAGER_ROLE(), deployer)
    automatedLineOfCreditFactory.grantRole(automatedLineOfCreditFactory.MANAGER_ROLE(), deployer)

    feeStrategy.initialize(config.flexiblePortfolio.managerFee)
    return { usdc, feeStrategy }
  }

  return {
    protocolConfig,
    fixedInterestOnlyLoans,
    flexiblePortfolioFactory,
    automatedLineOfCreditFactory,
    automatedLineOfCreditImplementation,
    depositController,
    withdrawController,
    blockedTransferController,
    multiFarmAllowedTransferController,
    openTransferController,
    valuationStrategy,
    fiolValuationStrategy,
    allowAllLenderVerifier,
    globalWhitelistLenderVerifier,
    globalWhitelistLenderVerifierWrapper,
    withdrawOncePortfolioIsClosedController,
    ...(isTestnet && deployTestnetContracts()),
  }
}
