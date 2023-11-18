import { expect, use } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioDepositFixture } from 'fixtures'
import { parseUSDC } from 'utils/parseUSDC'
import { YEAR } from 'utils/constants'
import { solidity } from 'ethereum-waffle'
import { Zero } from '@ethersproject/constants'
import { WithdrawOncePortfolioIsClosedController__factory } from 'build/types'

use(solidity)

describe('WithdrawOncePortfolioIsClosedController', () => {
  const amount = 50
  const fixtureLoader = setupFixtureLoader()
  const fixtureWithDeposit = flexiblePortfolioDepositFixture(amount)
  const loadFixture = () => fixtureLoader(fixtureWithDeposit)

  describe('maxWithdraw', () => {
    it('returns 0 if portfolio is open', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio } = await loadFixture()
      const portfolioAddress = portfolio.address
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      expect(await withdrawController.maxWithdraw(wallet.address)).to.be.equal(Zero)
    })

    it('returns a value when portfolio is closed', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio, timeTravel } = await loadFixture()
      const portfolioAddress = portfolio.address
      await timeTravel(2 * YEAR)
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      const maxWithdrawValue = await withdrawController.maxWithdraw(wallet.address)
      expect(maxWithdrawValue).to.be.equal(parseUSDC(amount))
    })
  })

  describe('maxRedeem', () => {
    it('reverts if portfolio is open', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio } = await loadFixture()
      const portfolioAddress = portfolio.address
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      expect(await withdrawController.maxRedeem(wallet.address)).to.be.equal(Zero)
    })

    it('returns a value when portfolio is closed', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio, timeTravel, parseShares } = await loadFixture()
      const portfolioAddress = portfolio.address
      await timeTravel(2 * YEAR)
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      const maxRedeemValue = await withdrawController.maxRedeem(wallet.address)
      expect(maxRedeemValue).to.be.equal(parseShares(amount))
    })
  })

  describe('onWithdraw', () => {
    it('returns zero value when portfolio is open', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio } = await loadFixture()
      const portfolioAddress = portfolio.address
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      const onWithdrawValue = await withdrawController.onWithdraw(wallet.address, parseUSDC(amount), wallet.address, wallet.address)
      expect(onWithdrawValue).to.be.deep.eq([Zero, Zero])
    })

    it('returns a correct value when portfolio is closed', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio, timeTravel, parseShares } = await loadFixture()
      const portfolioAddress = portfolio.address
      await timeTravel(2 * YEAR)
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      const onWithdrawValue = await withdrawController.onWithdraw(wallet.address, parseUSDC(amount), wallet.address, wallet.address)
      expect(onWithdrawValue[0]).to.be.equal(parseShares(amount))
      expect(onWithdrawValue[1]).to.be.eq(Zero)
    })
  })

  describe('onRedeem', () => {
    it('returns zero value when portfolio is open', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio } = await loadFixture()
      const portfolioAddress = portfolio.address
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      const onRedeemValue = await withdrawController.onRedeem(wallet.address, parseUSDC(amount), wallet.address, wallet.address)
      expect(onRedeemValue).to.be.deep.eq([Zero, Zero])
    })

    it('returns a correct value when portfolio is closed', async () => {
      const { wallet, withdrawOncePortfolioIsClosedController, portfolio, timeTravel } = await loadFixture()
      const portfolioAddress = portfolio.address
      await timeTravel(2 * YEAR)
      const withdrawController = WithdrawOncePortfolioIsClosedController__factory.connect(withdrawOncePortfolioIsClosedController.address, wallet).connect(portfolioAddress)
      const onRedeemValue = await withdrawController.onRedeem(wallet.address, parseUSDC(amount), wallet.address, wallet.address)
      expect(onRedeemValue[0]).to.be.equal(parseUSDC(amount))
      expect(onRedeemValue[1]).to.be.eq(Zero)
    })
  })
})
