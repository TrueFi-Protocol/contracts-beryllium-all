import { setupFixtureLoader } from 'test/setup'
import { expect } from 'chai'
import { MerkleTreeVerifierDepositController__factory } from 'build/types'
import { Wallet } from 'ethers'

describe('MerkleTreeVerifierDepositController.initialize', () => {
  const loadFixture = setupFixtureLoader()

  it('correctly sets fields', async () => {
    const { wallet } = await loadFixture(async () => {})
    const randomAddress = Wallet.createRandom().address
    const merkleTreeVerifierDepositController = await new MerkleTreeVerifierDepositController__factory(wallet).deploy()
    await merkleTreeVerifierDepositController.initialize(randomAddress, 10)

    expect(await merkleTreeVerifierDepositController.allowListIndex()).eq(10)
    expect(await merkleTreeVerifierDepositController.lenderVerifier()).eq(randomAddress)
  })

  it('cannot initialize twice', async () => {
    const { wallet, other } = await loadFixture(async () => {})

    const merkleTreeVerifierDepositController = await new MerkleTreeVerifierDepositController__factory(wallet).deploy()

    await merkleTreeVerifierDepositController.initialize(other.address, 10)
    await expect(merkleTreeVerifierDepositController.initialize(wallet.address, 20)).to.be.revertedWith('Initializable: contract is already initialized')
  })
})
