import { BulletLoansValuationStrategy__factory, DepositController__factory, FixedInterestOnlyLoansValuationStrategy__factory, MultiInstrumentValuationStrategy__factory, BlockedTransferController__factory, WithdrawController__factory, LegacyWhitelistDepositController__factory, MerkleTreeVerifierDepositController__factory, AllowAllLenderVerifier__factory, WithdrawOncePortfolioIsClosedController__factory, FeeStrategy__factory } from 'build'
import { IFeeStrategy__factory } from 'build/types/factories/IFeeStrategy__factory'
import { fpManagerFeeRate } from 'config'
import { deployMockContract } from 'ethereum-waffle'
import { Contract, ContractFactory, Wallet } from 'ethers'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import MerkleTreeVerifier from '../../../contracts/lithium/MerkleTreeVerifier.json'

export async function deployBasicControllers(protocolOwner: Wallet) {
  const allowAllLenderVerifier = await new AllowAllLenderVerifier__factory(protocolOwner).deploy()

  const depositControllerImplementation = await new DepositController__factory(protocolOwner).deploy()
  const withdrawControllerImplementation = await new WithdrawController__factory(protocolOwner).deploy()
  const transferControllerImplementation = await new BlockedTransferController__factory(protocolOwner).deploy()

  const controllersDeployData = {
    depositControllerImplementation: depositControllerImplementation.address,
    depositControllerInitData: depositControllerImplementation.interface.encodeFunctionData('initialize', [allowAllLenderVerifier.address]),
    withdrawControllerImplementation: withdrawControllerImplementation.address,
    withdrawControllerInitData: withdrawControllerImplementation.interface.encodeFunctionData('initialize'),
    transferControllerImplementation: transferControllerImplementation.address,
    transferControllerInitData: transferControllerImplementation.interface.encodeFunctionData('initialize'),
  }

  const merkleTreeVerifier = await new ContractFactory(MerkleTreeVerifier.abi, MerkleTreeVerifier.bytecode, protocolOwner).deploy()
  const merkleTreeVerifierDepositController = await new MerkleTreeVerifierDepositController__factory(protocolOwner).deploy()
  await merkleTreeVerifierDepositController.initialize(merkleTreeVerifier.address, 0)

  const whitelistDepositController = await new LegacyWhitelistDepositController__factory(protocolOwner).deploy()
  await whitelistDepositController.initialize(allowAllLenderVerifier.address)
  return {
    depositControllerImplementation,
    whitelistDepositController,
    withdrawOncePortfolioIsClosedController: await new WithdrawOncePortfolioIsClosedController__factory(protocolOwner).deploy(),
    withdrawControllerImplementation,
    transferControllerImplementation,
    controllersDeployData,
    merkleTreeVerifier,
    merkleTreeVerifierDepositController,
    allowAllLenderVerifier,
  }
}

export async function deployStrategies(protocolOwner: Wallet, bulletLoans: Contract, fixedInterestOnlyLoans: Contract, protocolConfig: Contract) {
  const basicControllers = await deployBasicControllers(protocolOwner)

  const multiInstrumentValuationStrategy = await deployBehindProxy(new MultiInstrumentValuationStrategy__factory(protocolOwner), protocolConfig.address)
  const bulletLoansValuationStrategy = await deployBehindProxy(new BulletLoansValuationStrategy__factory(protocolOwner), protocolConfig.address, bulletLoans.address, multiInstrumentValuationStrategy.address)
  const fixedInterestOnlyLoansValuationStrategy = await deployBehindProxy(new FixedInterestOnlyLoansValuationStrategy__factory(protocolOwner), protocolConfig.address, fixedInterestOnlyLoans.address, multiInstrumentValuationStrategy.address)

  await multiInstrumentValuationStrategy.addStrategy(bulletLoans.address, bulletLoansValuationStrategy.address)
  await multiInstrumentValuationStrategy.addStrategy(fixedInterestOnlyLoans.address, fixedInterestOnlyLoansValuationStrategy.address)

  const feeStrategy = await deployMockContract(protocolOwner, IFeeStrategy__factory.abi)
  await feeStrategy.mock.managerFeeRate.returns(fpManagerFeeRate)

  const feeStrategyImplementation = await new FeeStrategy__factory(protocolOwner).deploy()

  const controllersDeployData = {
    ...basicControllers.controllersDeployData,
    valuationStrategy: multiInstrumentValuationStrategy.address,
    feeStrategyImplementation: feeStrategyImplementation.address,
    feeStrategyInitData: feeStrategyImplementation.interface.encodeFunctionData('initialize', [fpManagerFeeRate]),
  }

  return {
    ...basicControllers,
    bulletLoansValuationStrategy,
    fixedInterestOnlyLoansValuationStrategy,
    valuationStrategy: multiInstrumentValuationStrategy,
    feeStrategyImplementation,
    feeStrategy,
    controllersDeployData,
  }
}
