import { GlobalWhitelistLenderVerifierWrapper__factory } from 'build/types'
import { ContractFactory, Wallet } from 'ethers'
import GlobalWhitelistLenderVerifier from '../../contracts/ragnarok/GlobalWhitelistLenderVerifier.json'

export async function globalWhitelistLenderVerifierWrapperFixture([wallet]: Wallet[]) {
  const globalWhitelistLenderVerifier = await new ContractFactory(GlobalWhitelistLenderVerifier.abi, GlobalWhitelistLenderVerifier.bytecode, wallet).deploy()
  const globalWhitelistLenderVerifierWrapper = await new GlobalWhitelistLenderVerifierWrapper__factory(wallet).deploy(globalWhitelistLenderVerifier.address)
  return { globalWhitelistLenderVerifierWrapper, globalWhitelistLenderVerifier, wallet }
}
