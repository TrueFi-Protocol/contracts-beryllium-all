import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { OpenTransferController__factory, WhitelistTransferController__factory } from 'build/types'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC } from 'utils'

describe('FlexiblePortfolio.transfer', () => {
  const loadFixture = setupFixtureLoader()

  const withSimpleTransferFixture = async () => {
    const fixtureResult = await loadFixture(flexiblePortfolioFixture)
    const { portfolio, wallet, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan } = fixtureResult

    const transferController = await new OpenTransferController__factory(wallet).deploy()
    await portfolio.setTransferController(transferController.address)

    const principal = parseUSDC(20)
    const interest = parseUSDC(10)
    await deposit(principal)
    const { loanId } = await addAcceptFundFixedInterestOnlyLoan(principal, 1, interest, DAY, wallet, 0)
    await repayFixedInterestOnlyLoan(loanId, principal.add(interest), wallet)

    return { ...fixtureResult, transferController }
  }

  const withWhitelistTransferFixture = async () => {
    const fixtureResult = await loadFixture(flexiblePortfolioFixture)
    const { portfolio, wallet, other, deposit } = fixtureResult

    const transferController = await new WhitelistTransferController__factory(wallet).deploy()
    await portfolio.setTransferController(transferController.address)
    await transferController.setWhitelistStatus(portfolio.address, wallet.address, other.address, true)

    await deposit(parseUSDC(10))

    return { ...fixtureResult, transferController }
  }

  it('transfers LP tokens', async () => {
    const { portfolio, other, wallet } = await withSimpleTransferFixture()

    const balanceBefore = await portfolio.balanceOf(wallet.address)
    await portfolio.connect(wallet).transfer(other.address, balanceBefore)
    expect(await portfolio.balanceOf(other.address)).to.equal(balanceBefore)
  })

  it('transfer reverts if paused', async () => {
    const { portfolio, other, wallet } = await withSimpleTransferFixture()
    const balanceBefore = await portfolio.balanceOf(wallet.address)
    await portfolio.pause()
    await expect(portfolio.connect(wallet).transfer(other.address, balanceBefore)).to.be.revertedWith('Pausable: paused')
  })

  it('transferFrom reverts if paused', async () => {
    const { portfolio, other, wallet } = await withSimpleTransferFixture()
    const balanceBefore = await portfolio.balanceOf(wallet.address)
    await portfolio.connect(other).approve(wallet.address, balanceBefore)
    await portfolio.pause()
    await expect(portfolio.connect(wallet).transferFrom(other.address, wallet.address, balanceBefore)).to.be.revertedWith('Pausable: paused')
  })

  it('transfer succeeds if recipient is whitelisted', async () => {
    const { portfolio, other, wallet } = await withWhitelistTransferFixture()
    const lpTokenBalance = await portfolio.balanceOf(wallet.address)
    await portfolio.connect(wallet).transfer(other.address, lpTokenBalance)
    expect(await portfolio.balanceOf(other.address)).to.equal(lpTokenBalance)
  })

  it('transferFrom succeeds if recipient is whitelisted', async () => {
    const { portfolio, other, wallet } = await withWhitelistTransferFixture()
    const lpTokenBalance = await portfolio.balanceOf(wallet.address)
    await portfolio.approve(other.address, lpTokenBalance)
    await portfolio.connect(other).transferFrom(wallet.address, other.address, lpTokenBalance)
    expect(await portfolio.balanceOf(other.address)).to.equal(lpTokenBalance)
  })

  it('transfer reverts if recipient is not whitelisted', async () => {
    const { portfolio, another, wallet } = await withWhitelistTransferFixture()
    const lpTokenBalance = await portfolio.balanceOf(wallet.address)
    await expect(portfolio.connect(wallet).transfer(another.address, lpTokenBalance)).to.be.revertedWith('FP:Operation not allowed')
  })

  it('transferFrom reverts if recipient is not whitelisted', async () => {
    const { portfolio, another, wallet } = await withWhitelistTransferFixture()
    const lpTokenBalance = await portfolio.balanceOf(wallet.address)
    await portfolio.approve(another.address, lpTokenBalance)
    await expect(portfolio.connect(another).transferFrom(wallet.address, another.address, lpTokenBalance)).to.be.revertedWith('FP:Operation not allowed')
  })
})
