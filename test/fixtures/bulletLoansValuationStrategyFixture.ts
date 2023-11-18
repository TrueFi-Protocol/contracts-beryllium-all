import { Wallet } from 'ethers'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { BulletLoansValuationStrategy__factory } from 'contracts'
import { deployBehindProxy } from 'utils/deployBehindProxy'
import { MockProvider } from 'ethereum-waffle'

export async function bulletLoansValuationStrategyFixture([wallet, borrower, parentStrategy]: Wallet[], provider: MockProvider) {
  const flexiblePortfolioFixtureData = await flexiblePortfolioFixture([wallet, borrower], provider)
  const { portfolio, protocolConfig, bulletLoans } = flexiblePortfolioFixtureData

  const valuationStrategy = await deployBehindProxy(new BulletLoansValuationStrategy__factory(wallet), protocolConfig.address, bulletLoans.address, parentStrategy.address)

  await portfolio.setValuationStrategy(valuationStrategy.address)

  return { ...flexiblePortfolioFixtureData, valuationStrategy, parentStrategy }
}
