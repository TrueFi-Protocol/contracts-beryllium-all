import { defaultAccounts } from 'ethereum-waffle'
import { printSuccessLine } from '../utils'
import { Web3Provider } from '@ethersproject/providers'
import { deployBerylliumPlayground } from './deploy'

export async function runBeryllium(provider: Web3Provider, deploymentsFile: string) {
  const { secretKey } = defaultAccounts[0]
  await deployBerylliumPlayground(secretKey, provider, deploymentsFile)
  printSuccessLine('Beryllium deployment')
}
