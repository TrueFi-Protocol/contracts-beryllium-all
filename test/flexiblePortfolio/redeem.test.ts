import { expect, use } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC, YEAR } from 'utils'
import { flexiblePortfolioFixture } from 'fixtures'
import { solidity } from 'ethereum-waffle'

use(solidity)

const amount = 10

describe('FlexiblePortfolio.redeem', () => {
  const loadFixture = setupFixtureLoader()

  const redeemFlexiblePortfolioFixture = async () => {
    const fixtureResult = await loadFixture(flexiblePortfolioFixture)
    const { deposit } = fixtureResult
    await deposit(parseUSDC(amount))
    return { ...fixtureResult }
  }

  it('transfers assets from portfolio to receiver', async () => {
    const { portfolio, token, wallet, other, parseShares } = await redeemFlexiblePortfolioFixture()
    await portfolio.redeem(parseShares(amount), other.address, wallet.address)
    expect(await token.balanceOf(portfolio.address)).to.equal(0)
    expect(await token.balanceOf(other.address)).to.equal(parseUSDC(amount))
  })

  it('burns owner\'s shares', async () => {
    const { portfolio, wallet, other, parseShares } = await redeemFlexiblePortfolioFixture()
    await portfolio.redeem(parseShares(amount), other.address, wallet.address)
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
  })

  it('returns amount of redeemed assets', async () => {
    const { portfolio, wallet, other, parseShares } = await redeemFlexiblePortfolioFixture()
    expect(await portfolio.callStatic.redeem(parseShares(amount), other.address, wallet.address)).to.equal(parseUSDC(amount))
  })

  it('redeems partially with two lenders', async () => {
    const { portfolio, token, wallet, deposit, other, parseShares } = await redeemFlexiblePortfolioFixture()
    const otherAmount = 20
    await token.mint(other.address, parseUSDC(otherAmount))
    await deposit(parseUSDC(otherAmount), { wallet: other })
    const walletBalanceBefore = await token.balanceOf(wallet.address)

    await portfolio.redeem(parseShares(amount / 2), wallet.address, wallet.address)
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(amount / 2))
    expect(await token.balanceOf(portfolio.address)).to.equal(parseUSDC(otherAmount + amount / 2))
    expect(await token.balanceOf(wallet.address)).to.equal(walletBalanceBefore.add(parseUSDC(amount / 2)))
  })

  it('updates portfolio totalAssets', async () => {
    const { portfolio, wallet, parseShares } = await redeemFlexiblePortfolioFixture()
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount))
    await portfolio.redeem(parseShares(amount), wallet.address, wallet.address)
    expect(await portfolio.totalAssets()).to.equal(0)
  })

  it('works for two redemptions one after another', async () => {
    const { portfolio, token, wallet, parseShares } = await redeemFlexiblePortfolioFixture()
    const balanceBefore = await token.balanceOf(wallet.address)
    await portfolio.redeem(parseShares(amount / 2), wallet.address, wallet.address)
    await portfolio.redeem(parseShares(amount / 2), wallet.address, wallet.address)
    expect(await token.balanceOf(portfolio.address)).to.equal(0)
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.add(parseUSDC(amount)))
  })

  it('works after loan repayment', async () => {
    const { portfolio, token, wallet, parseShares, repayFixedInterestOnlyLoan, addAcceptFundFixedInterestOnlyLoan, borrower } = await redeemFlexiblePortfolioFixture()
    await token.mint(borrower.address, parseUSDC(10))
    const { loanId } = await addAcceptFundFixedInterestOnlyLoan(parseUSDC(5), 1, parseUSDC(5), DAY, borrower, DAY)
    await repayFixedInterestOnlyLoan(loanId, parseUSDC(10), borrower)

    const balanceBefore = await token.balanceOf(wallet.address)
    await portfolio.redeem(parseShares(amount), wallet.address, wallet.address)
    expect(await token.balanceOf(portfolio.address)).to.equal(0)
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.add(parseUSDC(amount).add(parseUSDC(5))))
  })

  it('can redeem by approved non-owner', async () => {
    const { portfolio, token, wallet, other, parseShares } = await redeemFlexiblePortfolioFixture()
    await portfolio.approve(other.address, parseShares(amount))
    await portfolio.connect(other).redeem(parseShares(amount), other.address, wallet.address)
    expect(await token.balanceOf(portfolio.address)).to.equal(0)
    expect(await token.balanceOf(other.address)).to.equal(parseUSDC(amount))
  })

  it('can redeem by approved non-owner to designated recipient', async () => {
    const { portfolio, token, wallet, other, another, parseShares } = await redeemFlexiblePortfolioFixture()
    await portfolio.approve(other.address, parseShares(amount))
    await portfolio.connect(other).redeem(parseShares(amount), another.address, wallet.address)
    expect(await token.balanceOf(portfolio.address)).to.equal(0)
    expect(await token.balanceOf(another.address)).to.equal(parseUSDC(amount))
  })

  it('decreases allowance of non-owner', async () => {
    const { portfolio, wallet, other, parseShares } = await redeemFlexiblePortfolioFixture()
    await portfolio.approve(other.address, parseShares(amount))
    await portfolio.connect(other).redeem(parseShares(amount), other.address, wallet.address)
    expect(await portfolio.allowance(wallet.address, other.address)).to.equal(0)
  })

  it('reverts if redeeming exceeds portfolio balance', async () => {
    const { portfolio, wallet, parseShares, borrower, addAcceptFundFixedInterestOnlyLoan } = await redeemFlexiblePortfolioFixture()
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(5), 1, parseUSDC(5), DAY, borrower, DAY)
    await expect(portfolio.redeem(parseShares(amount), wallet.address, wallet.address))
      .to.be.revertedWith('FP:Not enough liquidity')
  })

  it('reverts if portfolio is paused', async () => {
    const { portfolio, deposit, wallet, parseShares } = await redeemFlexiblePortfolioFixture()
    await deposit(parseUSDC(amount))
    await portfolio.pause()
    await expect(portfolio.redeem(parseShares(amount), wallet.address, wallet.address))
      .to.be.revertedWith('Pausable: paused')
  })

  it('can\'t redeem when not allowed by withdrawController', async () => {
    const { portfolio, wallet, mockWithdrawController } = await redeemFlexiblePortfolioFixture()
    await mockWithdrawController({ onRedeem: { assets: 0, fee: 0 } })
    await expect(portfolio.redeem(parseUSDC(1), wallet.address, wallet.address))
      .to.be.revertedWith('FP:Operation not allowed')
  })

  it('reverts from non-owner if not approved', async () => {
    const { portfolio, wallet, other, parseShares } = await redeemFlexiblePortfolioFixture()
    await expect(portfolio.connect(other).redeem(parseShares(amount), other.address, wallet.address))
      .to.be.revertedWith('ERC20: decreased allowance below zero')
  })

  it('reverts from non-owner if approved amount is exceeded', async () => {
    const { portfolio, wallet, other, parseShares } = await redeemFlexiblePortfolioFixture()
    await portfolio.approve(other.address, parseShares(amount).div(2))
    await expect(portfolio.connect(other).redeem(parseShares(amount), other.address, wallet.address))
      .to.be.revertedWith('ERC20: decreased allowance below zero')
  })

  it('reverts when trying to redeem more shares than owned', async () => {
    const { portfolio, wallet, other, token, deposit } = await redeemFlexiblePortfolioFixture()
    await token.mint(other.address, parseUSDC(amount))
    await deposit(parseUSDC(amount), { wallet: other })
    const shares = await portfolio.balanceOf(wallet.address)
    await expect(portfolio.redeem(shares.add(1), wallet.address, wallet.address))
      .to.be.revertedWith('ERC20: burn amount exceeds balance')
  })

  it('updates last protocol fee rate', async () => {
    const { portfolio, wallet, other, parseShares, protocolConfig, fpProtocolFeeRate } = await redeemFlexiblePortfolioFixture()
    const newFeeRate = 100
    await protocolConfig.setProtocolFeeRate(newFeeRate)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(fpProtocolFeeRate)

    await portfolio.redeem(parseShares(amount), other.address, wallet.address)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(newFeeRate)
  })

  it('updates last manager fee rate', async () => {
    const { portfolio, wallet, other, parseShares, fpManagerFeeRate, setManagerFeeRate } = await redeemFlexiblePortfolioFixture()
    const newFeeRate = 100
    await setManagerFeeRate(newFeeRate)
    expect(await portfolio.lastManagerFeeRate()).to.equal(fpManagerFeeRate)

    await portfolio.redeem(parseShares(amount), other.address, wallet.address)
    expect(await portfolio.lastManagerFeeRate()).to.equal(newFeeRate)
  })

  it('calls onRedeem with correct arguments', async () => {
    const { portfolio, wallet, other, another, parseShares, withdrawController } = await redeemFlexiblePortfolioFixture()
    await portfolio.approve(other.address, parseShares(amount))
    await portfolio.connect(other).withdraw(parseUSDC(amount), another.address, wallet.address)
    expect('onRedeem').to.be.calledOnContractWith(withdrawController, [other.address, parseUSDC(amount), another.address, wallet.address])
  })

  it('emits a \'Withdraw\' event', async () => {
    const { portfolio, wallet, parseShares } = await redeemFlexiblePortfolioFixture()
    await expect(portfolio.redeem(parseShares(amount), wallet.address, wallet.address))
      .to.emit(portfolio, 'Withdraw')
      .withArgs(wallet.address, wallet.address, wallet.address, parseUSDC(amount), parseShares(amount))
  })

  it('pays accrued continuous fees', async () => {
    const { token, deposit, redeem, protocolConfig, protocolTreasury, executeAndSetNextTimestamp, parseShares, setManagerFeeRate, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await redeem(parseShares(amount))
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.025))
  })

  it('decreases totalAssets by protocol fee', async () => {
    const { portfolio, deposit, redeem, protocolConfig, executeAndSetNextTimestamp, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await redeem(parseShares(amount / 2))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.95 / 2))
  })

  it('decreases totalAssets by continuous manager fee', async () => {
    const { portfolio, deposit, redeem, setManagerFeeRate, executeAndSetNextTimestamp, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await redeem(parseShares(amount / 2))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.975 / 2))
  })

  it('decreases totalAssets by both continuous fees', async () => {
    const { portfolio, deposit, redeem, protocolConfig, executeAndSetNextTimestamp, parseShares, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await redeem(parseShares(amount / 2))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.925 / 2))
  })

  it('continuous fees exceed liquidity', async () => {
    const { deposit, redeem, protocolConfig, timeTravel, addAndFundBulletLoan, wallet, setManagerFeeRate, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await addAndFundBulletLoan(parseUSDC(amount * 0.925).add(1), parseUSDC(amount * 0.925).add(1), YEAR / 4, wallet)
    await timeTravel(YEAR / 2)
    await expect(redeem(parseShares(1))).to.be.revertedWith('FP:Not enough liquidity')
  })

  it('can redeem all liquidity minus continuous fees', async () => {
    const { portfolio, deposit, redeem, protocolConfig, timeTravel, addAndFundBulletLoan, wallet, parseShares, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await addAndFundBulletLoan(parseUSDC(amount * 0.9), parseUSDC(amount * 0.9), YEAR / 4, wallet)
    await timeTravel(YEAR / 2)
    await redeem(parseShares(amount).div(37).add(1))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('withdraws less assets with protocol fee', async () => {
    const { token, deposit, redeem, protocolConfig, executeAndSetNextTimestamp, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    const balanceBefore = await token.balanceOf(wallet.address)
    await redeem(parseShares(amount))
    const expectedWithdraw = parseUSDC(amount).mul(19).div(20)
    const currentBalance = await token.balanceOf(wallet.address)
    expect(currentBalance.sub(balanceBefore)).to.equal(expectedWithdraw)
  })

  it('withdraws less assets with manager continuous fee', async () => {
    const { token, deposit, redeem, executeAndSetNextTimestamp, wallet, parseShares, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    const balanceBefore = await token.balanceOf(wallet.address)
    await redeem(parseShares(amount))
    const expectedWithdraw = parseUSDC(amount).mul(39).div(40)
    const currentBalance = await token.balanceOf(wallet.address)
    expect(currentBalance.sub(balanceBefore)).to.equal(expectedWithdraw)
  })

  it('withdraws less assets with both continuous fees', async () => {
    const { token, deposit, redeem, protocolConfig, executeAndSetNextTimestamp, wallet, parseShares, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    const balanceBefore = await token.balanceOf(wallet.address)
    await redeem(parseShares(amount))
    const expectedWithdraw = parseUSDC(amount).mul(37).div(40)
    const currentBalance = await token.balanceOf(wallet.address)
    expect(currentBalance.sub(balanceBefore)).to.equal(expectedWithdraw)
  })

  it('emits FeePaid event for protocol fee', async () => {
    const { redeem, deposit, parseShares, protocolConfig, executeAndSetNextTimestamp, portfolio, protocolTreasury } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(redeem(parseShares(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(protocolTreasury, parseUSDC(amount * 0.05))
  })

  it('emits FeePaid event for continuous manager fee', async () => {
    const { redeem, deposit, parseShares, setManagerFeeRate, executeAndSetNextTimestamp, portfolio, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(redeem(parseShares(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, parseUSDC(amount * 0.025))
  })

  it('pays redeem fee', async () => {
    const { deposit, redeem, parseShares, mockWithdrawController, portfolio, managerFeeBeneficiaryAddress, token } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    const fee = 1
    await mockWithdrawController({ onRedeem: { assets: parseUSDC(amount - fee), fee: parseUSDC(fee) } })
    await redeem(parseShares(amount))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(fee))
  })

  it('emits FeePaid event for redeem fee', async () => {
    const { deposit, redeem, parseShares, mockWithdrawController, portfolio, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    const fee = 1
    await mockWithdrawController({ onRedeem: { assets: parseUSDC(amount - fee), fee: parseUSDC(fee) } })
    await expect(redeem(parseShares(amount)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, parseUSDC(fee))
  })

  it('can redeem all shares with fee', async () => {
    const { deposit, redeem, parseShares, mockWithdrawController, portfolio, wallet } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    const fee = 1
    await mockWithdrawController({ onRedeem: { assets: parseUSDC(amount - fee), fee: parseUSDC(fee) } })
    await redeem(parseShares(amount))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(0)
  })

  it('reverts when fee exceeds liquidity', async () => {
    const { deposit, redeem, parseShares, mockWithdrawController } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    const fee = 1
    await mockWithdrawController({ onRedeem: { assets: parseUSDC(amount), fee: parseUSDC(fee) } })
    await expect(redeem(parseShares(amount))).to.be.revertedWith('FP:Not enough liquidity')
  })

  it('transfers amount reduced by redeem fee', async () => {
    const { deposit, redeem, parseShares, mockWithdrawController, token, wallet } = await loadFixture(flexiblePortfolioFixture)
    const fee = 1
    await deposit(parseUSDC(amount))
    await mockWithdrawController({ onRedeem: { assets: parseUSDC(amount - fee), fee: parseUSDC(fee) } })
    const balanceBeforeRedeem = await token.balanceOf(wallet.address)
    await redeem(parseShares(amount))
    const balanceAfterRedeem = await token.balanceOf(wallet.address)
    expect(balanceAfterRedeem.sub(balanceBeforeRedeem)).to.equal(parseUSDC(amount - fee))
  })

  it('returns amount reduced by redeem fee', async () => {
    const { deposit, portfolio, parseShares, mockWithdrawController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const fee = 1
    await deposit(parseUSDC(amount))
    await mockWithdrawController({ onRedeem: { assets: parseUSDC(amount - fee), fee: parseUSDC(fee) } })
    expect(await portfolio.callStatic.redeem(parseShares(amount), wallet.address, wallet.address)).to.equal(parseUSDC(amount - fee))
  })

  it('transfers assets provided by strategy', async () => {
    const { wallet, redeem, mockWithdrawController, parseShares, portfolio, token, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await mockWithdrawController({ onRedeem: { assets: 1, fee: 0 } })
    await redeem(parseShares(amount / 2), wallet, other)

    expect(await portfolio.virtualTokenBalance()).to.equal(parseUSDC(amount).sub(1))
    expect(await token.balanceOf(portfolio.address)).to.equal(parseUSDC(amount).sub(1))
    expect(await token.balanceOf(other.address)).to.equal(1)
  })

  it('can\'t withdraw to portfolio', async () => {
    const { portfolio, wallet, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await expect(portfolio.redeem(1, portfolio.address, wallet.address)).to.be.revertedWith('FP:Wrong receiver/owner')
  })

  it('can\'t withdraw from portfolio', async () => {
    const { portfolio, wallet, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await expect(portfolio.redeem(1, portfolio.address, wallet.address)).to.be.revertedWith('FP:Wrong receiver/owner')
  })
})
