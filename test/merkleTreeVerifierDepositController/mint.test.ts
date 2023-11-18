import { flexiblePortfolioMerkleTreeFixture } from 'fixtures'
import { setupFixtureLoader } from 'test/setup'
import { generateMerkleTree } from 'utils/generateMerkleTree'
import { expect } from 'chai'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY } from 'utils/constants'

describe('MerkleTreeVerifierDepositController.mint', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 10

  describe('single leaf', () => {
    it('deposits with valid proof', async () => {
      const { wallet, setVerifierRoot, token, portfolio, merkleTreeVerifierDepositController, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([wallet.address])
      await setVerifierRoot(root)

      await merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(amount), proof)
      expect(await token.balanceOf(portfolio.address)).to.eq(parseUSDC(amount))
    })

    it('does not allow deposit with invalid proof', async () => {
      const { wallet, other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { root } = generateMerkleTree([other.address])
      await setVerifierRoot(root)
      const { proof: invalidProof } = generateMerkleTree([wallet.address])

      await expect(merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(amount), invalidProof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })

    it('does not allow deposit when not whitelisted', async () => {
      const { other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, leaves, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([other.address, ...leaves])
      await setVerifierRoot(root)

      await expect(merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(amount), proof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })
  })

  describe('multiple leaves', () => {
    it('deposits with valid proof', async () => {
      const { wallet, setVerifierRoot, token, portfolio, merkleTreeVerifierDepositController, leaves, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([wallet.address, ...leaves])
      await setVerifierRoot(root)

      await merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(amount), proof)
      expect(await token.balanceOf(portfolio.address)).to.eq(parseUSDC(amount))
    })

    it('does not allow deposit with invalid proof', async () => {
      const { wallet, other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, leaves, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { root } = generateMerkleTree([other.address, ...leaves])
      await setVerifierRoot(root)
      const { proof: invalidProof } = generateMerkleTree([wallet.address, ...leaves])

      await expect(merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(amount), invalidProof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })

    it('does not allow deposit when not whitelisted', async () => {
      const { other, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, leaves, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([other.address, ...leaves])
      await setVerifierRoot(root)

      await expect(merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(amount), proof))
        .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
    })

    it('transfers more assets as value appreciates', async () => {
      const { wallet, token, setVerifierRoot, portfolio, merkleTreeVerifierDepositController, leaves, parseShares, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
      const { proof, root } = generateMerkleTree([wallet.address, ...leaves])
      await setVerifierRoot(root)
      await merkleTreeVerifierDepositController.deposit(portfolio.address, parseUSDC(amount), proof)

      await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, parseUSDC(amount), DAY, wallet, DAY)
      await repayFixedInterestOnlyLoan(0, parseUSDC(amount * 2), wallet)

      await token.approve(merkleTreeVerifierDepositController.address, parseUSDC(40))
      await merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(20), proof)

      expect(await token.balanceOf(portfolio.address)).to.eq(parseUSDC(amount * 2 + 40))
      expect(await token.allowance(wallet.address, merkleTreeVerifierDepositController.address)).to.eq(0)
    })
  })

  it('reverts if trying to deposit through portfolio', async () => {
    const { wallet, setVerifierRoot, leaves, token, portfolio, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
    const { root } = generateMerkleTree([wallet.address, ...leaves])
    await setVerifierRoot(root)

    await token.approve(portfolio.address, parseShares(amount))
    await expect(portfolio.mint(parseShares(amount), wallet.address))
      .to.be.revertedWith('MerkleTreeVerifierDepositController: Trying to bypass controller')
  })

  it('reverts for no root stored', async () => {
    const { other, token, portfolio, merkleTreeVerifierDepositController, leaves, parseShares } = await loadFixture(flexiblePortfolioMerkleTreeFixture(amount))
    const { proof } = generateMerkleTree([other.address, ...leaves])

    await token.approve(merkleTreeVerifierDepositController.address, parseShares(amount))
    await expect(merkleTreeVerifierDepositController.mint(portfolio.address, parseShares(amount), proof))
      .to.be.revertedWith('MerkleTreeVerifierDepositController: Invalid proof')
  })
})
