import {
  BulletLoans__factory,
  FlexiblePortfolio__factory,
  MockUsdc__factory,
  FixedInterestOnlyLoans__factory,
  ProtocolConfig__factory,
  DepositController__factory,
  BlockedTransferController__factory,
  WithdrawController__factory,
} from 'build'
import { BigNumber, BigNumberish, ContractTransaction, Wallet } from 'ethers'
import {
  parseUSDC,
  timeTravel as _timeTravel,
  timeTravelTo as _timeTravelTo,
  setNextBlockTimestamp as _setNextBlockTimestamp,
  getTxTimestamp as _getTxTimestamp,
  executeAndSetNextTimestamp as _executeAndSetNextTimestamp,
  MockDepositControllerConfig,
  mockDepositController as _mockDepositController,
  mockWithdrawController as _mockWithdrawController,
  generateRandomLeaves,
} from 'utils'
import { YEAR } from 'utils/constants'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { parseEth } from 'utils/parseEth'
import { extractArgFromTx } from 'utils'
import { deployFlexiblePortfolioFactory, deployStrategies } from './tasks'
import { MockProvider } from 'ethereum-waffle'
import { BytesLike, parseUnits } from 'ethers/lib/utils'
import { fpProtocolFeeRate, fpManagerFeeRate } from 'config'
import { MockWithdrawControllerConfig } from 'utils/mockWithdrawController'

enum FixedInterestOnlyLoanStatus {
  Created,
  Accepted,
  Started,
  Repaid,
  Cancelled,
  Defaulted
}

export const flexiblePortfolioFeeFixture = (protocolFeeRate: BigNumberish, managerFeeRate: BigNumberish) => {
  return async function ([wallet]: Wallet[], provider: MockProvider) {
    const fixtureData = await flexiblePortfolioFixture([wallet], provider)
    const { protocolConfig, setManagerFeeRate } = fixtureData
    await protocolConfig.setProtocolFeeRate(protocolFeeRate)
    await setManagerFeeRate(managerFeeRate)
    return { ...fixtureData, protocolFeeRate, managerFeeRate }
  }
}

export const flexiblePortfolioDepositFixture = (amount: BigNumberish) => {
  return async function ([wallet]: Wallet[], provider: MockProvider) {
    const fixtureData = await flexiblePortfolioFixture([wallet], provider)
    const { deposit } = fixtureData
    await deposit(parseUSDC(amount), { wallet })
    return { ...fixtureData, amount }
  }
}

export const flexiblePortfolioMerkleTreeFixture = (amount: BigNumberish) => {
  return async function ([wallet]: Wallet[], provider: MockProvider) {
    const fixtureData = await flexiblePortfolioFixture([wallet], provider)
    const leaves = generateRandomLeaves()

    const { token, portfolio, merkleTreeVerifierDepositController } = fixtureData
    await portfolio.setDepositController(merkleTreeVerifierDepositController.address)
    await token.approve(merkleTreeVerifierDepositController.address, parseUSDC(amount))
    return { ...fixtureData, leaves }
  }
}

export async function flexiblePortfolioFixture([wallet, borrower]: Wallet[], provider: MockProvider) {
  const token = await new MockUsdc__factory(wallet).deploy()
  await token.mint(wallet.address, parseEth(10000))
  const bulletLoans = await new BulletLoans__factory(wallet).deploy()
  const fixedInterestOnlyLoans = await new FixedInterestOnlyLoans__factory(wallet).deploy()

  const allowedInstruments = [bulletLoans.address, fixedInterestOnlyLoans.address]
  const managerFeeBeneficiaryAddress = Wallet.createRandom().address
  const protocolTreasury = Wallet.createRandom().address
  const protocolConfig = await deployBehindProxy(new ProtocolConfig__factory(wallet), fpProtocolFeeRate, wallet.address, protocolTreasury, wallet.address)

  const controllers = await deployStrategies(wallet, bulletLoans, fixedInterestOnlyLoans, protocolConfig)
  const {
    feeStrategy,
    controllersDeployData,
    merkleTreeVerifier,
  } = controllers

  const portfolioDuration = YEAR
  const maxSize = parseUSDC(100)
  const managerFeeRate = 0
  const name = 'Flexible Portfolio'
  const symbol = 'FLEX'
  const { factory } = await deployFlexiblePortfolioFactory(wallet, wallet, protocolConfig)
  const creationTx = await factory.createPortfolio(
    token.address,
    portfolioDuration,
    maxSize,
    controllersDeployData,
    allowedInstruments,
    {
      name,
      symbol,
    },
  )
  const portfolioAddress = await extractArgFromTx(creationTx, [factory.address, 'PortfolioCreated', 'newPortfolio'])
  const portfolio = FlexiblePortfolio__factory.connect(portfolioAddress, wallet)
  await portfolio.setManagerFeeBeneficiary(managerFeeBeneficiaryAddress)
  await portfolio.setFeeStrategy(feeStrategy.address)
  const depositController = DepositController__factory.connect(await portfolio.depositController(), wallet)
  const withdrawController = WithdrawController__factory.connect(await portfolio.withdrawController(), wallet)
  const transferController = BlockedTransferController__factory.connect(await portfolio.transferController(), wallet)

  const DEFAULT_ADMIN_ROLE = await portfolio.DEFAULT_ADMIN_ROLE()
  const MANAGER_ROLE = await portfolio.MANAGER_ROLE()
  const CONTROLLER_ADMIN_ROLE = await portfolio.CONTROLLER_ADMIN_ROLE()
  const PAUSER_ROLE = await portfolio.PAUSER_ROLE()

  const setDepositController = (address: string) => portfolio.setDepositController(address)
  const setWithdrawController = (address: string) => portfolio.setWithdrawController(address)
  const setTransferController = (address: string) => portfolio.setTransferController(address)
  const setValuationStrategy = (address: string) => portfolio.setValuationStrategy(address)
  const setFeeStrategy = (address: string) => portfolio.setFeeStrategy(address)

  const markInstrumentAsDefaulted = (instrument: string, id: number) => portfolio.markInstrumentAsDefaulted(instrument, id)

  const timeTravel = (time: number) => _timeTravel(provider, time)
  const timeTravelTo = (time: number) => _timeTravelTo(provider, time)
  const setNextBlockTimestamp = (timestamp: number) => _setNextBlockTimestamp(provider, timestamp)
  const getTxTimestamp = async (tx: ContractTransaction | Promise<ContractTransaction>) => _getTxTimestamp(await tx, provider)
  const executeAndSetNextTimestamp = (tx: Promise<ContractTransaction>, timestamp: number) => _executeAndSetNextTimestamp(provider, tx, timestamp)
  const executeAndTimeTravel = async (tx: Promise<ContractTransaction>, timestamp: number) => {
    const txTimestamp = await getTxTimestamp(tx)
    await timeTravelTo(txTimestamp + timestamp)
  }

  async function deposit(amount: BigNumberish, optionalParams?: {wallet?: Wallet, allowance?: BigNumberish, timestamp?: number}) {
    const _wallet = optionalParams?.wallet ?? wallet
    const allowance = optionalParams?.allowance ?? amount
    await token.connect(_wallet).approve(portfolio.address, allowance)
    if (optionalParams?.timestamp) {
      await setNextBlockTimestamp(optionalParams.timestamp)
    }
    return portfolio.connect(_wallet).deposit(amount, _wallet.address)
  }

  async function mint(shares: BigNumberish, owner = wallet, receiver = wallet, txTimestamp?: number) {
    const assets = await portfolio.previewMint(shares)
    await token.connect(owner).approve(portfolio.address, assets)
    if (txTimestamp) {
      await setNextBlockTimestamp(txTimestamp)
    }
    return portfolio.connect(owner).mint(shares, receiver.address)
  }

  function withdraw(wallet: Wallet, amount: BigNumberish, receiver?: { address: string }, owner?: { address: string }) {
    receiver = receiver || wallet
    owner = owner || wallet
    return portfolio.connect(wallet).withdraw(amount, receiver.address, owner.address)
  }

  function redeem(amount: BigNumberish, sender = wallet, receiver?: { address: string }, owner?: { address: string }) {
    receiver = receiver || sender
    owner = owner || sender
    return portfolio.connect(sender).redeem(amount, receiver.address, owner.address)
  }

  function allowInstrument(instrument: string, isAllowed: boolean) {
    return portfolio.allowInstrument(instrument, isAllowed)
  }

  function addBulletLoan(principalAmount: BigNumber, repaymentAmount: BigNumber, duration: BigNumberish, borrower: Wallet) {
    const data = bulletLoans.interface.encodeFunctionData('createLoan', [token.address, principalAmount, repaymentAmount, duration, borrower.address])
    return portfolio.addInstrument(bulletLoans.address, data)
  }

  async function addAndFundBulletLoan(principalAmount: BigNumber, repaymentAmount: BigNumber, duration: BigNumberish, borrower: Wallet) {
    const loanId = await extractLoanId(addBulletLoan(principalAmount, repaymentAmount, duration, borrower))
    const txTimestamp = await getTxTimestamp(portfolio.fundInstrument(bulletLoans.address, loanId))
    return { loanId, txTimestamp }
  }

  async function repayBulletLoan(instrumentId: BigNumberish, amount: BigNumberish, borrower: Wallet, timestamp?: number) {
    await token.connect(borrower).approve(portfolio.address, amount)
    if (timestamp) {
      await setNextBlockTimestamp(timestamp)
    }
    return portfolio.connect(borrower).repay(bulletLoans.address, instrumentId, amount)
  }

  function addFixedInterestOnlyLoan(
    principalAmount: BigNumber,
    periodCount: BigNumberish,
    periodPayment: BigNumber,
    periodDuration: BigNumberish,
    borrower: Wallet,
    gracePeriod: BigNumberish,
    canRepayAfterDefault = false,
  ) {
    const data = fixedInterestOnlyLoans.interface.encodeFunctionData(
      'issueLoan',
      [
        token.address,
        principalAmount,
        periodCount,
        periodPayment,
        periodDuration,
        borrower.address,
        gracePeriod,
        canRepayAfterDefault,
      ],
    )
    return portfolio.addInstrument(fixedInterestOnlyLoans.address, data)
  }

  async function addAcceptFundFixedInterestOnlyLoan(
    principalAmount: BigNumber,
    periodCount: BigNumberish,
    periodPayment: BigNumber,
    periodDuration: BigNumberish,
    borrower: Wallet,
    gracePeriod: BigNumberish,
  ) {
    const loanId = await extractLoanId(
      addFixedInterestOnlyLoan(principalAmount, periodCount, periodPayment, periodDuration, borrower, gracePeriod),
    )
    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(loanId)
    const txTimestamp = await getTxTimestamp(portfolio.fundInstrument(fixedInterestOnlyLoans.address, loanId))
    return { loanId, txTimestamp }
  }

  async function repayFixedInterestOnlyLoan(instrumentId: BigNumberish, amount: BigNumberish, borrower: Wallet, timestamp?: number) {
    await token.connect(borrower).approve(portfolio.address, amount)
    if (timestamp) {
      await setNextBlockTimestamp(timestamp)
    }
    return portfolio.connect(borrower).repay(fixedInterestOnlyLoans.address, instrumentId, amount)
  }

  function extractLoanId(pendingTx: Promise<ContractTransaction>) {
    return extractArgFromTx(pendingTx, [portfolio.address, 'InstrumentAdded', 'instrumentId'])
  }

  const mockDepositController = (config: MockDepositControllerConfig) => _mockDepositController(wallet, setDepositController, config)

  const mockWithdrawController = (config?: MockWithdrawControllerConfig) => _mockWithdrawController(wallet, setWithdrawController, config)

  async function setManagerFeeRate(newFeeRate: BigNumberish) {
    await feeStrategy.mock.managerFeeRate.returns(newFeeRate)
  }

  const tokenDecimals = await token.decimals()
  const parseShares = (amount: BigNumberish) => parseUnits(amount.toString(), tokenDecimals)

  const setVerifierRoot = (root: BytesLike) => merkleTreeVerifier.connect(wallet).setRoots([0], [root])
  await merkleTreeVerifier.grantRole(MANAGER_ROLE, wallet.address)

  return {
    portfolio,
    token,
    DEFAULT_ADMIN_ROLE,
    MANAGER_ROLE,
    CONTROLLER_ADMIN_ROLE,
    PAUSER_ROLE,
    depositController,
    withdrawController,
    transferController,
    deposit,
    withdraw,
    redeem,
    mint,
    setDepositController,
    bulletLoans,
    setTransferController,
    setValuationStrategy,
    portfolioDuration,
    fixedInterestOnlyLoans,
    allowInstrument,
    addBulletLoan,
    addFixedInterestOnlyLoan,
    maxSize,
    borrower,
    FixedInterestOnlyLoanStatus,
    timeTravel,
    timeTravelTo,
    extractLoanId,
    repayBulletLoan,
    addAndFundBulletLoan,
    addAcceptFundFixedInterestOnlyLoan,
    repayFixedInterestOnlyLoan,
    protocolConfig,
    protocolTreasury,
    managerFeeBeneficiaryAddress,
    markInstrumentAsDefaulted,
    name,
    symbol,
    creationTx,
    factory,
    fpProtocolFeeRate,
    managerFeeRate,
    setNextBlockTimestamp,
    getTxTimestamp,
    parseShares,
    tokenDecimals,
    mockDepositController,
    mockWithdrawController,
    setWithdrawController,
    ...controllers,
    executeAndTimeTravel,
    executeAndSetNextTimestamp,
    setManagerFeeRate,
    setFeeStrategy,
    fpManagerFeeRate,
    setVerifierRoot,
  }
}
