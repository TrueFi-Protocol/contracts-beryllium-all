import { AllowAllLenderVerifier__factory } from 'build/types'
import { Wallet } from 'ethers'

export async function allowAllLenderVerifierFixture([owner, other]: Wallet[]) {
  const allowAllLenderVerifier = await new AllowAllLenderVerifier__factory(owner).deploy()
  return { allowAllLenderVerifier, owner, other }
}
