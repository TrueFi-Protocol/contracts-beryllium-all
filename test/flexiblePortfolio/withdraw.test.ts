import { expect, use } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioDepositFixture } from 'fixtures'
import { parseUSDC } from 'utils/parseUSDC'
import { DAY, YEAR } from 'utils/constants'
import { solidity } from 'ethereum-waffle'

use(solidity)

describe('FlexiblePortfolio.withdraw', () => {
  const amount = 50
  const fixtureLoader = setupFixtureLoader()
  const fixtureWithDeposit = flexiblePortfolioDepositFixture(amount)
  const loadFixture = () => fixtureLoader(fixtureWithDeposit)

  it('cannot withdraw 0 assets', async () => {
    const { withdraw, wallet } = await loadFixture()
    await expect(withdraw(wallet, 0)).to.be.revertedWith('FP:Operation not allowed')
  })

  it('cannot withdraw without assets', async () => {
    const { withdraw, other } = await loadFixture()
    await expect(withdraw(other, 1)).to.be.revertedWith('ERC20: burn amount exceeds balance')
  })

  it('cannot withdraw more assets than owned', async () => {
    const { withdraw, deposit, wallet, token, other } = await loadFixture()
    await token.mint(other.address, parseUSDC(amount))
    await deposit(parseUSDC(amount), { wallet: other })
    await expect(withdraw(wallet, parseUSDC(amount + 1))).to.be.revertedWith('ERC20: burn amount exceeds balance')
  })

  it('burns owner LP tokens', async () => {
    const { withdraw, wallet, portfolio } = await loadFixture()
    await withdraw(wallet, parseUSDC(amount))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
  })

  it('burns owner LP tokens when sender is non-owner', async () => {
    const { withdraw, wallet, portfolio, other, parseShares } = await loadFixture()
    await portfolio.approve(other.address, parseShares(amount))
    await withdraw(other, parseUSDC(amount), wallet, wallet)
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
  })

  it('burns LP tokens according to withdraw controller', async () => {
    const { withdraw, wallet, portfolio, parseShares, mockWithdrawController } = await loadFixture()
    await mockWithdrawController({ onWithdraw: { shares: parseShares(1) } })
    await withdraw(wallet, parseUSDC(amount))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(amount - 1))
  })

  it('transfers funds from portfolio', async () => {
    const { withdraw, portfolio, wallet, token } = await loadFixture()
    await withdraw(wallet, parseUSDC(amount))
    expect(await token.balanceOf(portfolio.address)).to.equal(0)
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('transfers funds to receiver', async () => {
    const { withdraw, wallet, token } = await loadFixture()
    const balanceBefore = await token.balanceOf(wallet.address)
    await withdraw(wallet, parseUSDC(amount))
    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.add(parseUSDC(amount)))
  })

  it('transfers funds to receiver when receiver is not owner', async () => {
    const { withdraw, wallet, other, token } = await loadFixture()
    await withdraw(wallet, parseUSDC(amount), other, wallet)
    expect(await token.balanceOf(other.address)).to.equal(parseUSDC(amount))
  })

  it('decreases allowance when non-owner withdraws', async () => {
    const { withdraw, wallet, portfolio, other, parseShares } = await loadFixture()
    await portfolio.approve(other.address, parseShares(amount))
    await withdraw(other, parseUSDC(amount / 2), wallet, wallet)
    expect(await portfolio.allowance(wallet.address, other.address)).to.equal(parseShares(amount / 2))
  })

  it('reverts from non-owner if not approved', async () => {
    const { wallet, other, withdraw } = await loadFixture()
    await expect(withdraw(other, parseUSDC(amount), wallet, wallet))
      .to.be.revertedWith('ERC20: decreased allowance below zero')
  })

  it('reverts from non-owner if approved amount is exceeded', async () => {
    const { portfolio, wallet, other, parseShares, withdraw } = await loadFixture()
    await portfolio.approve(other.address, parseShares(amount / 2))
    await expect(withdraw(other, parseUSDC(amount), other, wallet))
      .to.be.revertedWith('ERC20: decreased allowance below zero')
  })

  it('returns amount of withdrawn shares', async () => {
    const { portfolio, wallet, parseShares } = await loadFixture()
    expect(await portfolio.callStatic.withdraw(parseUSDC(amount), wallet.address, wallet.address)).to.equal(parseShares(amount))
  })

  it('allows partial withdraw with two lenders', async () => {
    const { withdraw, token, deposit, other } = await loadFixture()
    const otherAmount = 20
    await token.mint(other.address, parseUSDC(otherAmount))
    await deposit(parseUSDC(otherAmount), { wallet: other })
    await withdraw(other, parseUSDC(otherAmount / 2))

    expect(await token.balanceOf(other.address)).to.equal(parseUSDC(otherAmount / 2))
  })

  it('can withdraw accrued interest', async () => {
    const { portfolio, wallet, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, timeTravel, withdraw } = await loadFixture()
    const interest = parseUSDC(5)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, interest, DAY, wallet, DAY)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(amount).add(interest), wallet)
    await withdraw(wallet, parseUSDC(amount).add(interest))
    expect(await portfolio.totalAssets()).to.equal(0)
  })

  it('can\'t withdraw to portfolio', async () => {
    const { portfolio, wallet, withdraw } = await loadFixture()
    await expect(withdraw(wallet, 1, portfolio, wallet)).to.be.revertedWith('FP:Wrong receiver/owner')
  })

  it('can\'t withdraw from portfolio', async () => {
    const { portfolio, wallet, withdraw } = await loadFixture()
    await expect(withdraw(wallet, 1, wallet, portfolio)).to.be.revertedWith('FP:Wrong receiver/owner')
  })

  it('reverts if withdrawing exceeds portfolio liquidity', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, wallet, withdraw } = await loadFixture()
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, parseUSDC(1), DAY, wallet, DAY)
    await expect(withdraw(wallet, 1)).to.be.revertedWith('FP:Not enough liquidity')
  })

  it('reverts if portfolio is paused', async () => {
    const { portfolio, wallet, withdraw } = await loadFixture()
    await portfolio.pause()
    await expect(withdraw(wallet, 1)).to.be.revertedWith('Pausable: paused')
  })

  it('rounds up', async () => {
    const { portfolio, addAcceptFundFixedInterestOnlyLoan, timeTravel, wallet } = await loadFixture()
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(10), DAY * 3, wallet, DAY)
    await timeTravel(DAY)

    const sharesRoundedDown = await portfolio.convertToShares(parseUSDC(amount).div(2))
    const burnedShares = await portfolio.callStatic.withdraw(parseUSDC(amount).div(2), wallet.address, wallet.address)
    expect(burnedShares).to.equal(sharesRoundedDown.add(1))
  })

  it('can\'t withdraw when not allowed by withdrawController', async () => {
    const { wallet, withdraw, mockWithdrawController, parseShares } = await loadFixture()
    await mockWithdrawController({ onWithdraw: { shares: parseShares(0) } })
    await expect(withdraw(wallet, 1)).to.be.revertedWith('FP:Operation not allowed')
  })

  it('can withdraw past end date', async () => {
    const { withdraw, wallet, portfolio, timeTravel, portfolioDuration } = await loadFixture()
    await timeTravel(portfolioDuration + DAY)
    await expect(withdraw(wallet, parseUSDC(amount))).not.to.be.reverted
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
  })

  it('updates last protocol fee rate', async () => {
    const { withdraw, wallet, portfolio, protocolConfig, fpProtocolFeeRate } = await loadFixture()
    const newFeeRate = 100
    await protocolConfig.setProtocolFeeRate(newFeeRate)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(fpProtocolFeeRate)

    await withdraw(wallet, parseUSDC(amount))
    expect(await portfolio.lastProtocolFeeRate()).to.equal(newFeeRate)
  })

  it('updates last manager fee rate', async () => {
    const { withdraw, wallet, portfolio, setManagerFeeRate, fpManagerFeeRate } = await loadFixture()
    const newFeeRate = 100
    await setManagerFeeRate(newFeeRate)
    expect(await portfolio.lastManagerFeeRate()).to.equal(fpManagerFeeRate)

    await withdraw(wallet, parseUSDC(amount))
    expect(await portfolio.lastManagerFeeRate()).to.equal(newFeeRate)
  })

  it('calls onWithdraw with correct arguments', async () => {
    const { portfolio, wallet, other, another, parseShares, withdrawController } = await loadFixture()
    await portfolio.approve(other.address, parseShares(amount))
    await portfolio.connect(other).withdraw(parseUSDC(amount), another.address, wallet.address)
    expect('onWithdraw').to.be.calledOnContractWith(withdrawController, [other.address, parseUSDC(amount), another.address, wallet.address])
  })

  it('emits a \'Withdraw\' event', async () => {
    const { portfolio, wallet, parseShares, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, timeTravel, other, withdraw } = await loadFixture()
    const interest = parseUSDC(5)
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(amount), 1, interest, DAY, wallet, DAY)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(amount).add(interest), wallet)

    await expect(withdraw(wallet, parseUSDC(amount).add(interest), other, wallet))
      .to.emit(portfolio, 'Withdraw')
      .withArgs(wallet.address, other.address, wallet.address, parseUSDC(amount).add(interest), parseShares(amount))
  })

  it('pays both accrued fees', async () => {
    const { token, deposit, withdraw, protocolConfig, protocolTreasury, executeAndSetNextTimestamp, wallet, managerFeeBeneficiaryAddress, setManagerFeeRate } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await withdraw(wallet, parseUSDC(amount * 2 * 0.925))
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 2 * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 2 * 0.025))
  })

  it('decreases totalAssets by protocol fee', async () => {
    const { portfolio, deposit, wallet, protocolConfig, executeAndSetNextTimestamp, withdraw } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await withdraw(wallet, parseUSDC(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.9))
  })

  it('decreases totalAssets by continuous manager fee', async () => {
    const { portfolio, deposit, wallet, setManagerFeeRate, executeAndSetNextTimestamp, withdraw } = await loadFixture()
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await withdraw(wallet, parseUSDC(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.95))
  })

  it('decreases totalAssets by both continuous fees', async () => {
    const { portfolio, deposit, wallet, protocolConfig, executeAndSetNextTimestamp, withdraw, setManagerFeeRate } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await withdraw(wallet, parseUSDC(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.85))
  })

  it('continuous fees exceed liquidity', async () => {
    const { deposit, protocolConfig, executeAndSetNextTimestamp, wallet, withdraw, setManagerFeeRate } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(withdraw(wallet, parseUSDC(amount * 2 * 0.925).add(1)))
      .to.be.revertedWith('FP:Not enough liquidity')
  })

  it('can redeem all liquidity minus continuous fees', async () => {
    const { portfolio, deposit, protocolConfig, timeTravel, executeAndSetNextTimestamp, wallet, withdraw, setManagerFeeRate } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await timeTravel(YEAR / 2)
    await withdraw(wallet, parseUSDC(amount * 2 * 0.925))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('emits FeePaid event for protocol fee', async () => {
    const { withdraw, deposit, wallet, protocolConfig, executeAndSetNextTimestamp, portfolio, protocolTreasury } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(withdraw(wallet, parseUSDC(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(protocolTreasury, parseUSDC(amount * 2 * 0.05))
  })

  it('emits FeePaid event for continuous manager fee', async () => {
    const { withdraw, deposit, wallet, executeAndSetNextTimestamp, portfolio, setManagerFeeRate, managerFeeBeneficiaryAddress } = await loadFixture()
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(withdraw(wallet, parseUSDC(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, parseUSDC(amount * 2 * 0.025))
  })

  it('pays withdraw fee', async () => {
    const { wallet, withdraw, mockWithdrawController, portfolio, managerFeeBeneficiaryAddress, token, parseShares } = await loadFixture()
    const fee = 1
    await mockWithdrawController({ onWithdraw: { shares: parseShares(amount), fee: parseUSDC(fee) } })
    await withdraw(wallet, parseUSDC(amount - fee))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(fee))
  })

  it('emits FeePaid event for withdraw fee', async () => {
    const { wallet, withdraw, mockWithdrawController, portfolio, managerFeeBeneficiaryAddress, parseShares } = await loadFixture()
    const fee = 1
    await mockWithdrawController({ onWithdraw: { shares: parseShares(amount - fee), fee: parseUSDC(fee) } })
    await expect(withdraw(wallet, parseUSDC(amount - fee)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, parseUSDC(fee))
  })

  it('can withdraw all shares with fee', async () => {
    const { withdraw, mockWithdrawController, portfolio, wallet, parseShares } = await loadFixture()
    const fee = 1
    await mockWithdrawController({ onWithdraw: { shares: parseShares(amount), fee: parseUSDC(fee) } })
    await withdraw(wallet, parseUSDC(amount - fee))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
  })

  it('reverts when strategy requires more shares than user balance', async () => {
    const { withdraw, mockWithdrawController, wallet, parseShares } = await loadFixture()
    await mockWithdrawController({ onWithdraw: { shares: parseShares(amount + 1) } })
    await expect(withdraw(wallet, parseUSDC(amount)))
      .to.be.revertedWith('ERC20: burn amount exceeds balance')
  })

  it('reverts when withdraw fee is bigger than liquidity', async () => {
    const { addAndFundBulletLoan, withdraw, mockWithdrawController, wallet, portfolio } = await loadFixture()
    const fee = 2
    await addAndFundBulletLoan(parseUSDC(amount - fee / 2), parseUSDC(amount - fee / 2), DAY, wallet)
    const liquidity = await portfolio.virtualTokenBalance()
    const liquidityInShares = await portfolio.convertToShares(liquidity)
    await mockWithdrawController({ onWithdraw: { shares: liquidityInShares, fee: parseUSDC(fee) } })
    await expect(withdraw(wallet, liquidity)).to.be.revertedWith('FP:Not enough liquidity')
  })
})
