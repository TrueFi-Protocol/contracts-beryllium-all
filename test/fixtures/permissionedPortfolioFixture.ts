import { MockProvider } from 'ethereum-waffle'
import { Wallet } from 'ethers'
import { parseUSDC } from 'utils/parseUSDC'
import { permissionedPortfolioFactoryFixture } from './permissionedPortfolioFactoryFixture'

export async function permissionedPortfolioFixture(wallets: Wallet[], provider: MockProvider) {
  const forcedTransfersAdmin = wallets[1]
  const lender = wallets[2]
  const ppFixture = await permissionedPortfolioFactoryFixture(wallets, provider)
  await ppFixture.setDefaultForcedTransfersAdmin(forcedTransfersAdmin.address)
  const { portfolio } = await ppFixture.createPortfolio()
  await ppFixture.token.mint(lender.address, parseUSDC(1_000_000))
  await ppFixture.token.connect(lender).approve(portfolio.address, parseUSDC(1_000_000))
  await portfolio.connect(lender).deposit(parseUSDC(1_000_000), lender.address)

  return {
    ...ppFixture,
    portfolio,
    forcedTransfersAdmin,
    lender,
  }
}
