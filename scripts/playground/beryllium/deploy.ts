import { DAY } from '../../../test/utils/constants'
import { parseUnits } from 'ethers/lib/utils'
import { JsonRpcProvider } from '@ethersproject/providers'
import { deploy, Options, saveContract, reduce } from 'ethereum-mars'
import {
  AutomatedLineOfCredit,
} from '../../../build/artifacts'
import { Address } from 'ethereum-mars/build/src/symbols'
import { makeContractInstance } from 'ethereum-mars/build/src/syntax/contract'
import { deployBeryllium } from '../../deployment/deployBeryllium'
import { deployDydxBeryllium } from '../../deployment/deployDydxBeryllium'
import { DepositController__factory, WithdrawController__factory, FeeStrategy__factory, BlockedTransferController__factory } from '../../../build/types'

const getOptions = (privateKey: string, provider: JsonRpcProvider, deploymentsFile: string): Options => ({
  privateKey,
  network: provider,
  noConfirm: true,
  verify: false,
  disableCommandLineOptions: true,
  outputFile: deploymentsFile,
})

export function deployBerylliumPlayground(privateKey: string, provider: JsonRpcProvider, deploymentsFile: string) {
  const options = getOptions(privateKey, provider, deploymentsFile)
  return deploy(options, (deployer, executeOptions) => {
    const berylliumContracts = deployBeryllium(deployer, executeOptions, 'beryllium_')
    const berylliumDydxContracts = deployDydxBeryllium(deployer, executeOptions, 'beryllium_')
    deployPlaygroundOnlyContracts(deployer, { ...berylliumContracts, ...berylliumDydxContracts })
  })
}

function deployPlaygroundOnlyContracts(deployer: string, berylliumContracts: ReturnType<typeof deployBeryllium> & ReturnType<typeof deployDydxBeryllium>) {
  const {
    usdc,
    automatedLineOfCreditFactory,
    flexiblePortfolioFactory,
    blockedTransferController: transferController,
    withdrawController,
    depositController,
    feeStrategy,
    valuationStrategy,
    dydxAutomatedLineOfCreditFactory,
    allowAllLenderVerifier: lenderVerifier,
  } = berylliumContracts

  const AlocControllersData = reduce(
    [depositController[Address], withdrawController[Address], transferController[Address], lenderVerifier[Address]],
    (depositControllerImplementation, withdrawControllerImplementation, transferControllerImplementation, lenderVerifierContract) => {
      return {
        depositControllerImplementation,
        depositControllerInitData: new DepositController__factory().interface.encodeFunctionData('initialize', [lenderVerifierContract]),
        withdrawControllerImplementation,
        withdrawControllerInitData: new WithdrawController__factory().interface.encodeFunctionData('initialize', []),
        transferControllerImplementation,
        transferControllerInitData: new BlockedTransferController__factory().interface.encodeFunctionData('initialize', []),
      }
    },
  )

  automatedLineOfCreditFactory.createPortfolio(
    30 * DAY,
    usdc[Address],
    usdc.decimals().map(decimals => parseUnits('1500000', decimals)),
    {
      minInterestRate: 300,
      minInterestRateUtilizationThreshold: 2000,
      optimumInterestRate: 500,
      optimumUtilization: 6000,
      maxInterestRate: 900,
      maxInterestRateUtilizationThreshold: 9000,
    },
    AlocControllersData,
    'Beryllium Example USDC ALOC',
    'BEALOC',
  )

  const alocExample = automatedLineOfCreditFactory.getPortfolios().map(portfolios => portfolios[portfolios.length - 1])
  const alocExampleInstance = makeContractInstance('e2eTestsALOC', AutomatedLineOfCredit, alocExample)

  const parseUSDC = (value: string) => parseUnits(value, 6)
  usdc.mint(deployer, parseUSDC('1000000'))
  usdc.approve(alocExample, parseUSDC('100000'))
  alocExampleInstance.deposit(parseUSDC('100000'), deployer)

  saveContract('beryllium_alocForNonUS', alocExample)

  dydxAutomatedLineOfCreditFactory.createPortfolio(
    30 * DAY,
    usdc[Address],
    usdc.decimals().map(decimals => parseUnits('1500000', decimals)),
    {
      minInterestRate: 300,
      minInterestRateUtilizationThreshold: 2000,
      optimumInterestRate: 500,
      optimumUtilization: 6000,
      maxInterestRate: 900,
      maxInterestRateUtilizationThreshold: 9000,
    },
    AlocControllersData,
    'Beryllium DYDX Example USDC ALOC',
    'BDYDXEALOC',
  )

  const dydxAlocExample = dydxAutomatedLineOfCreditFactory.getPortfolios().map(portfolios => portfolios[portfolios.length - 1])
  usdc.mint(deployer, parseUSDC('1000000'))
  saveContract('beryllium_dydxAloc', dydxAlocExample)

  const controllersData = reduce(
    [depositController[Address], withdrawController[Address], transferController[Address], valuationStrategy[Address], feeStrategy[Address], lenderVerifier[Address]],
    (depositControllerImplementation, withdrawControllerImplementation, transferControllerImplementation, valuationStrategy, feeStrategyImplementation, lenderVerifierContract) => {
      return {
        depositControllerImplementation,
        depositControllerInitData: new DepositController__factory().interface.encodeFunctionData('initialize', [lenderVerifierContract]),
        withdrawControllerImplementation,
        withdrawControllerInitData: new WithdrawController__factory().interface.encodeFunctionData('initialize', []),
        transferControllerImplementation,
        transferControllerInitData: new BlockedTransferController__factory().interface.encodeFunctionData('initialize', []),
        valuationStrategy,
        feeStrategyImplementation,
        feeStrategyInitData: new FeeStrategy__factory().interface.encodeFunctionData('initialize', [75]),
      }
    },
  )

  flexiblePortfolioFactory.createPortfolio(
    usdc[Address],
    30 * DAY,
    usdc.decimals().map(decimals => parseUnits('1500000', decimals)),
    controllersData,
    [],
    {
      name: 'Beryllium example Flexible Portfolio',
      symbol: 'BEFP',
    },
  )

  const fpExample = flexiblePortfolioFactory.getPortfolios().map(portfolios => portfolios[portfolios.length - 1])
  saveContract('beryllium_fpExample', fpExample)
}
