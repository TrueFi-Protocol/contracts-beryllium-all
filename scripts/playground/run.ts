import { startGanache, printSuccessLine } from './utils'
import { defaultAccounts } from 'ethereum-waffle'
import { deployBeryllium } from '../deployment/deployBeryllium'
import { deploy } from 'ethereum-mars'
import { Wallet } from 'ethers'

async function run() {
  const provider = await startGanache()

  const owner = new Wallet(defaultAccounts[0].secretKey, provider)
  process.env.PRIVATE_KEY = owner.privateKey

  await deploy({ network: provider, noConfirm: true }, deployBeryllium)
  printSuccessLine('Beryllium deployment')
}

run()
