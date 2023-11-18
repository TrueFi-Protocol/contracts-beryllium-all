import { AutomatedLineOfCredit, DepositController__factory, ILenderVerifier__factory } from 'build/types'
import { FlexiblePortfolio } from 'build/types/contracts'
import { deployMockContract } from 'ethereum-waffle'
import { Wallet } from 'ethers'

export interface MockLenderVerifierConfig {
  whitelistedAddresses: string[],
}

export async function mockLenderVerifier(
  wallet: Wallet,
  portfolio: FlexiblePortfolio | AutomatedLineOfCredit,
  { whitelistedAddresses }: MockLenderVerifierConfig,
) {
  const mockContract = await deployMockContract(wallet, ILenderVerifier__factory.abi)
  const newDepositController = await new DepositController__factory(wallet).deploy()
  await newDepositController.initialize(mockContract.address)
  await portfolio.setDepositController(newDepositController.address)

  await mockContract.mock.isAllowed.returns(false)
  for (const address of whitelistedAddresses) {
    await mockContract.mock.isAllowed.withArgs(address).returns(true)
  }

  return mockContract
}
