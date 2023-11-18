import { flexiblePortfolioMerkleTreeFixture } from 'fixtures'
import { setupFixtureLoader } from 'test/setup'
import { generateMerkleTree } from 'utils/generateMerkleTree'
import { parseUSDC } from 'utils'
import { expect } from 'chai'

describe('MerkleTreeVerifierDepositController.deposit', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 10

  describe('single leaf', () => {
    it('deposits with valid proof', async () => {
      const { wallet, setVerifierRoot, token, portfolio, merkleTreeVerifierDepositController } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([wallet.address])
      await setVerifierRoot(root)

      await merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), proof)
      expect(await token.balanceOf(portfolio.address)).to.eq(parseUSDC(amount))
    })

    it('does not allow deposit with invalid proof', async () => {
      const { wallet, other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { root } = generateMerkleTree([other.address])
      await setVerifierRoot(root)
      const { proof: invalidProof } = generateMerkleTree([wallet.address])

      await expect(merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), invalidProof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })

    it('does not allow deposit when not whitelisted', async () => {
      const { other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, leaves } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([other.address, ...leaves])
      await setVerifierRoot(root)

      await expect(merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), proof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })
  })

  describe('multiple leaves', () => {
    it('deposits with valid proof', async () => {
      const { wallet, setVerifierRoot, token, portfolio, merkleTreeVerifierDepositController, leaves } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([wallet.address, ...leaves])
      await setVerifierRoot(root)

      await merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), proof)
      expect(await token.balanceOf(portfolio.address)).to.eq(parseUSDC(amount))
    })

    it('does not allow deposit with invalid proof', async () => {
      const { wallet, other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, leaves } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { root } = generateMerkleTree([other.address, ...leaves])
      await setVerifierRoot(root)
      const { proof: invalidProof } = generateMerkleTree([wallet.address, ...leaves])

      await expect(merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), invalidProof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })

    it('does not allow deposit when not whitelisted', async () => {
      const { other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, leaves } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([other.address, ...leaves])
      await setVerifierRoot(root)

      await expect(merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), proof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })
  })

  it('reverts if trying to deposit through portfolio', async () => {
    const { wallet, setVerifierRoot, leaves, token, portfolio } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
    const { root } = generateMerkleTree([wallet.address, ...leaves])
    await setVerifierRoot(root)

    await token.approve(portfolio.address, parseUSDC(amount))
    await expect(portfolio.deposit(parseUSDC(amount), wallet.address))
      .to.be.revertedWith('MerkleTreeVerifierDepositController: Trying to bypass controller')
  })

  it('reverts for no root stored', async () => {
    const { other, token, portfolio, merkleTreeVerifierDepositController, leaves } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
    const { proof } = generateMerkleTree([other.address, ...leaves])

    await token.approve(merkleTreeVerifierDepositController.address, parseUSDC(amount))
    await expect(merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), proof))
      .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
  })
})
