import { MerkleTree } from 'merkletreejs'
import { keccak256, solidityKeccak256, solidityPack } from 'ethers/lib/utils'
import { Wallet } from 'ethers'

export const hash = (str: string) => solidityKeccak256(['bytes'], [solidityPack(['address'], [str])])

export const generateRandomLeaves = () => [
  Wallet.createRandom().address,
  Wallet.createRandom().address,
  Wallet.createRandom().address,
  Wallet.createRandom().address,
  Wallet.createRandom().address,
  Wallet.createRandom().address,
]

export function generateMerkleTree(leaves: string[]) {
  const hashedLeaves = leaves.map((x) => hash(x))

  const tree = new MerkleTree(hashedLeaves, keccak256, { sortPairs: true })
  const firstLeaf = hashedLeaves[0]
  const root = tree.getHexRoot()
  const proof = tree.getHexProof(firstLeaf)

  return { root, proof }
}
