import { Wallet } from 'ethers'
import { FeeStrategy__factory } from 'build/types'

export async function feeStrategyFixture([wallet]: Wallet[]) {
  const managerFeeRate = 100
  const feeStrategy = await new FeeStrategy__factory(wallet).deploy()
  await feeStrategy.initialize(managerFeeRate)
  return { feeStrategy, managerFeeRate }
}
