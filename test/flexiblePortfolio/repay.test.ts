import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { DAY, parseUSDC, YEAR } from 'utils'
import { MockUsdc__factory } from 'build/types'

describe('FlexiblePortfolio.repay', () => {
  const loadFixture = setupFixtureLoader()

  const amount = parseUSDC(100)

  it('reverts if paused', async () => {
    const { portfolio, token, addBulletLoan, bulletLoans, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addBulletLoan(amount, amount.mul(2), DAY, other)
    await portfolio.fundInstrument(bulletLoans.address, 0)
    await token.connect(other).approve(portfolio.address, amount)

    await portfolio.pause()

    await expect(deposit(parseUSDC(150))).to.be.revertedWith('Pausable: paused')
  })

  it('can only be called by recipient', async () => {
    const { portfolio, bulletLoans, another } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.connect(another).repay(bulletLoans.address, 0, amount)).to.be.revertedWith('FP:Wrong recipient')
  })

  it('transfers funds from borrower to portfolio', async () => {
    const { portfolio, token, addBulletLoan, bulletLoans, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addBulletLoan(amount, amount.mul(2), DAY, other)
    await portfolio.fundInstrument(bulletLoans.address, 0)
    await token.connect(other).approve(portfolio.address, amount)

    await expect(() => portfolio.connect(other).repay(bulletLoans.address, 0, amount)).to.changeTokenBalances(token, [other, portfolio.address], [amount.mul(-1), amount])
    expect(await portfolio.virtualTokenBalance()).to.equal(amount)
  })

  it('calls repay on debt instrument contract', async () => {
    const { portfolio, token, addBulletLoan, bulletLoans, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addBulletLoan(amount, amount.mul(2), DAY, other)
    await portfolio.fundInstrument(bulletLoans.address, 0)
    await token.connect(other).approve(portfolio.address, amount)
    await expect(portfolio.connect(other).repay(bulletLoans.address, 0, amount))
      .to.emit(bulletLoans, 'LoanRepaid')
      .withArgs(0, amount)
  })

  it('emits an event', async () => {
    const { portfolio, token, addBulletLoan, bulletLoans, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addBulletLoan(amount, amount.mul(2), DAY, other)
    await portfolio.fundInstrument(bulletLoans.address, 0)
    await token.connect(other).approve(portfolio.address, amount)
    await expect(portfolio.connect(other).repay(bulletLoans.address, 0, amount))
      .to.emit(portfolio, 'InstrumentRepaid')
      .withArgs(bulletLoans.address, 0, amount)
  })

  it('reverts when repaying 0 amount', async () => {
    const { portfolio, token, addBulletLoan, bulletLoans, other, deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addBulletLoan(amount, amount.mul(2), DAY, other)
    await portfolio.fundInstrument(bulletLoans.address, 0)
    await token.connect(other).approve(portfolio.address, amount)
    await expect(portfolio.connect(other).repay(bulletLoans.address, 0, 0)).to.be.revertedWith('FP:Amount can\'t be 0')
  })

  it('cannot repay defaulted loan if canBeRepaidAfterDefault flag is false', async () => {
    const { portfolio, token, addFixedInterestOnlyLoan, fixedInterestOnlyLoans, other, deposit, markInstrumentAsDefaulted, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addFixedInterestOnlyLoan(amount, 2, parseUSDC(1), DAY, other, DAY, false)
    await fixedInterestOnlyLoans.connect(other).acceptLoan(0)
    await portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0)
    const repaymentAmount = await fixedInterestOnlyLoans.expectedRepaymentAmount(0)
    await token.connect(other).approve(portfolio.address, repaymentAmount)

    await timeTravel((DAY * 2) + 1)
    await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)
    await expect(portfolio.connect(other).repay(fixedInterestOnlyLoans.address, 0, repaymentAmount)).to.be.revertedWith('FixedInterestOnlyLoans: This loan cannot be repaid')
  })

  it('can repay defaulted loan if canBeRepaidAfterDefault flag is true', async () => {
    const { portfolio, addFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, fixedInterestOnlyLoans, other, deposit, markInstrumentAsDefaulted, timeTravel } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)

    await addFixedInterestOnlyLoan(amount, 2, parseUSDC(1), DAY, other, DAY, true)
    await fixedInterestOnlyLoans.connect(other).acceptLoan(0)
    await portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0)

    await timeTravel((DAY * 2) + 1)
    await markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)
    await repayFixedInterestOnlyLoan(0, parseUSDC(1), other)

    expect(await portfolio.virtualTokenBalance()).to.equal(parseUSDC(1))
  })

  it('updates last protocol fee rate', async () => {
    const { portfolio, other, deposit, protocolConfig, fpProtocolFeeRate, addAndFundBulletLoan, repayBulletLoan } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addAndFundBulletLoan(amount, amount.mul(2), DAY, other)

    const newFeeRate = 100
    await protocolConfig.setProtocolFeeRate(newFeeRate)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(fpProtocolFeeRate)

    await repayBulletLoan(0, amount, other)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(newFeeRate)
  })

  it('updates last manager fee rate', async () => {
    const { portfolio, other, deposit, setManagerFeeRate, fpManagerFeeRate, addAndFundBulletLoan, repayBulletLoan } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await addAndFundBulletLoan(amount, amount.mul(2), DAY, other)

    const newFeeRate = 100
    await setManagerFeeRate(newFeeRate)
    expect(await portfolio.lastManagerFeeRate()).to.equal(fpManagerFeeRate)

    await repayBulletLoan(0, amount, other)
    expect(await portfolio.lastManagerFeeRate()).to.equal(newFeeRate)
  })

  it('pays accrued fee', async () => {
    const { deposit, protocolConfig, protocolTreasury, token, other, repayFixedInterestOnlyLoan, addAcceptFundFixedInterestOnlyLoan, setManagerFeeRate, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await deposit(amount)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(1), DAY, other, DAY)
    await repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(1)), other, txTimestamp + YEAR / 2)
    expect(await token.balanceOf(protocolTreasury)).to.equal(amount.add(parseUSDC(1)).div(20))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(amount.add(parseUSDC(1)).div(40))
  })

  it('decreases totalAssets by protocol fee', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, deposit, protocolConfig, token, other, portfolio, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await deposit(amount)
    await protocolConfig.setProtocolFeeRate(1000)
    const { txTimestamp } = await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(1), DAY, other, DAY)
    await repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(1)), other, txTimestamp + YEAR / 2)
    expect(await portfolio.totalAssets()).to.equal(amount.add(parseUSDC(1)).mul(19).div(20))
  })

  it('decreases totalAssets by continuous manager fee', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, deposit, setManagerFeeRate, token, other, portfolio, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await deposit(amount)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(1), DAY, other, DAY)
    await repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(1)), other, txTimestamp + YEAR / 2)
    expect(await portfolio.totalAssets()).to.equal(amount.add(parseUSDC(1)).mul(39).div(40))
  })

  it('decreases totalAssets by both continuous fees', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, deposit, setManagerFeeRate, protocolConfig, token, other, portfolio, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await deposit(amount)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)

    const { txTimestamp } = await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(1), DAY, other, DAY)
    await repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(1)), other, txTimestamp + YEAR / 2)
    expect(await portfolio.totalAssets()).to.equal(amount.add(parseUSDC(1)).mul(37).div(40))
  })

  it('protocol fee exceeds liquidity', async () => {
    const { portfolio, deposit, repayBulletLoan, setManagerFeeRate, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)

    const { txTimestamp } = await addAndFundBulletLoan(amount, amount, DAY, wallet)
    await repayBulletLoan(0, 1, wallet, txTimestamp + YEAR / 2)
    expect(await token.balanceOf(protocolTreasury)).to.equal(1)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(0)
    expect(await portfolio.unpaidProtocolFee()).to.equal(amount.div(20).sub(1))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('manager fee exceeds liquidity', async () => {
    const { portfolio, deposit, repayBulletLoan, setManagerFeeRate, token, addAndFundBulletLoan, wallet, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await setManagerFeeRate(1000)
    const { txTimestamp } = await addAndFundBulletLoan(amount, amount, DAY, wallet)
    await repayBulletLoan(0, 1, wallet, txTimestamp + YEAR / 2)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(1)
    expect(await portfolio.unpaidManagerFee()).to.equal(amount.div(20).sub(1))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('prioritizes protocol fee', async () => {
    const { portfolio, deposit, repayBulletLoan, setManagerFeeRate, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await deposit(amount)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(amount, amount, DAY, wallet)
    await repayBulletLoan(0, amount.mul(6).div(100), wallet, txTimestamp + YEAR / 2)

    expect(await token.balanceOf(protocolTreasury)).to.equal(amount.div(20))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(amount.div(100))
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
    expect(await portfolio.unpaidManagerFee()).to.equal(amount.div(40).sub(amount.div(100)))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('takes unpaidProtocolFee into consideration', async () => {
    const { portfolio, deposit, setNextBlockTimestamp, bulletLoans, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, executeAndSetNextTimestamp, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    const amount = 100
    await deposit(parseUSDC(amount))
    await token.approve(portfolio.address, parseUSDC(amount * 2))
    await protocolConfig.setProtocolFeeRate(1000)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 10, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 4)
    await executeAndSetNextTimestamp(portfolio.updateAndPayFee(), YEAR / 4)
    await portfolio.repay(bulletLoans.address, 0, parseShares(amount))

    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.025 + amount * 0.975 * 0.025))
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
  })

  it('continuous fees are increased by interest', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, deposit, protocolConfig, setManagerFeeRate, managerFeeBeneficiaryAddress, token, other, portfolio, repayFixedInterestOnlyLoan, protocolTreasury } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await deposit(amount)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(1500)

    const { txTimestamp } = await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(1), DAY, other, DAY)
    await repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(1)), other, txTimestamp + YEAR * 4)

    expect(await token.balanceOf(protocolTreasury)).to.equal(amount.add(parseUSDC(1)).mul(2).div(5))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(amount.add(parseUSDC(1)).mul(3).div(5))
    expect(await portfolio.totalAssets()).to.equal(0)
    expect(await token.balanceOf(portfolio.address)).to.equal(0)
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('emits FeePaid event for protocol fee', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, deposit, protocolConfig, token, other, portfolio, repayFixedInterestOnlyLoan, protocolTreasury } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await deposit(amount)
    await protocolConfig.setProtocolFeeRate(1000)
    const { txTimestamp } = await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(1), DAY, other, DAY)
    await expect(repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(1)), other, txTimestamp + YEAR / 2))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(protocolTreasury, amount.add(parseUSDC(1)).div(20))
  })

  it('emits FeePaid event for continuous manager fee', async () => {
    const { addAcceptFundFixedInterestOnlyLoan, deposit, setManagerFeeRate, token, other, portfolio, repayFixedInterestOnlyLoan, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await deposit(amount)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAcceptFundFixedInterestOnlyLoan(amount, 1, parseUSDC(1), DAY, other, DAY)
    await expect(repayFixedInterestOnlyLoan(0, amount.add(parseUSDC(1)), other, txTimestamp + YEAR / 2))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, amount.add(parseUSDC(1)).div(40))
  })

  it('pays unpaid continuous fees', async () => {
    const { portfolio, token, protocolTreasury, executeAndSetNextTimestamp, managerFeeBeneficiaryAddress, repayBulletLoan, parseShares, deposit, setNextBlockTimestamp, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, wallet } = await loadFixture(flexiblePortfolioFixture)
    const amount = 10
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await executeAndSetNextTimestamp(portfolio.updateAndPayFee(), DAY)
    expect(await token.balanceOf(protocolTreasury)).to.equal(0)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(0)

    const accruedProtocolFee = parseUSDC(amount * 0.925 * 0.1).mul(DAY).div(YEAR)
    const accruedManagerFee = parseUSDC(amount * 0.925 * 0.05).mul(DAY).div(YEAR)
    await repayBulletLoan(0, parseShares(amount), wallet)
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05).add(accruedProtocolFee))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.025).add(accruedManagerFee))
  })

  it('cannot repay not added instruments', async () => {
    const { portfolio, fixedInterestOnlyLoans, other } = await loadFixture(flexiblePortfolioFixture)
    const worthlessToken = await new MockUsdc__factory(other).deploy()
    await worthlessToken.connect(other).mint(other.address, parseUSDC(2_000_000_000_000))
    await worthlessToken.connect(other).approve(portfolio.address, parseUSDC(2_000_000_000_000))

    await fixedInterestOnlyLoans.connect(other).issueLoan(worthlessToken.address, parseUSDC(1_000_000_000_000), 1, parseUSDC(1_000_000_000_000), 1, other.address, 1, true)
    await fixedInterestOnlyLoans.connect(other).acceptLoan(0)
    await fixedInterestOnlyLoans.connect(other).start(0)
    await fixedInterestOnlyLoans.connect(other).transferFrom(other.address, portfolio.address, 0)

    await expect(portfolio.connect(other).repay(fixedInterestOnlyLoans.address, 0, parseUSDC(2_000_000_000_000))).to.be.revertedWith('FP:Instrument not added')
  })
})
