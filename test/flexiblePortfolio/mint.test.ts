import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC, YEAR } from 'utils'

describe('FlexiblePortfolio.mint', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 10

  it('reverts if paused', async () => {
    const { portfolio, mint } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.pause()
    await expect(mint(parseUSDC(50))).to.be.revertedWith('Pausable: paused')
  })

  it('reverts when max size exceeded', async () => {
    const { mint, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await expect(mint(parseShares(150))).to.be.revertedWith('FP:Portfolio is full')
  })

  it('reverts when not allowed to deposit', async () => {
    const { mint, parseShares, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    await mockDepositController({ onMint: { assets: 0 } })
    await expect(mint(parseShares(1))).to.be.revertedWith('FP:Operation not allowed')
  })

  it('reverts past end date', async () => {
    const { mint, portfolioDuration, timeTravel, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await timeTravel(portfolioDuration + 1)
    await expect(mint(parseShares(100)))
      .to.be.revertedWith('FP:End date elapsed')
  })

  it('transfers funds to portfolio', async () => {
    const { portfolio, token, mint, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await mint(parseShares(amount))
    expect(await token.balanceOf(portfolio.address)).to.equal(parseUSDC(amount))
    expect(await portfolio.virtualTokenBalance()).to.equal(parseUSDC(amount))
  })

  it('transfers funds from caller', async () => {
    const { mint, other, token, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    const balanceBefore = await token.balanceOf(wallet.address)
    await mint(parseShares(amount), wallet, other)
    expect(balanceBefore.sub(await token.balanceOf(wallet.address))).to.equal(parseUSDC(amount))
  })

  it('transfers more assets as value appreciates', async () => {
    const { mint, other, token, wallet, parseShares, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, deposit } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(100))
    await deposit(parseUSDC(20), { wallet: other })
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 1, parseUSDC(20), DAY, wallet, DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(40), wallet)
    const otherBalanceBefore = await token.balanceOf(other.address)
    await mint(parseShares(20), other, other)
    expect(await token.balanceOf(other.address)).to.equal(otherBalanceBefore.sub(parseUSDC(40)))
  })

  it('transfers less assets after default', async () => {
    const { portfolio, addAcceptFundFixedInterestOnlyLoan, mint, fixedInterestOnlyLoans, token, other, timeTravel, wallet, parseShares, deposit } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(100))
    await deposit(parseUSDC(20), { wallet: other })
    const { loanId } = await addAcceptFundFixedInterestOnlyLoan(parseUSDC(10), 1, parseUSDC(5), DAY, wallet, DAY)
    await timeTravel(DAY + DAY + 1)
    await portfolio.markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, loanId)
    const otherBalanceBefore = await token.balanceOf(other.address)
    await mint(parseShares(20), other, other)
    expect(await token.balanceOf(other.address)).to.equal(otherBalanceBefore.sub(parseUSDC(10)))
  })

  it('mints shares to receiver', async () => {
    const { portfolio, mint, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await mint(parseShares(100))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(100))
  })

  it('returns amount of assets transferred', async () => {
    const { portfolio, wallet, token, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await token.approve(portfolio.address, parseUSDC(100))
    const assets = await portfolio.callStatic.mint(parseShares(100), wallet.address)
    expect(assets).to.equal(parseUSDC(100))
  })

  it('calls onMint with correct arguments', async () => {
    const { mint, wallet, other, mockDepositController, parseShares } = await loadFixture(flexiblePortfolioFixture)
    const strategyContract = await mockDepositController({ onMint: { assets: 1 } })
    await mint(parseShares(1), wallet, other)
    expect('onMint').to.be.calledOnContractWith(strategyContract, [wallet.address, parseShares(1), other.address])
  })

  it('rounds up when converting to assets', async () => {
    const { portfolio, deposit, other, token, mint, wallet, borrower, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(other.address, parseUSDC(1))
    await token.mint(borrower.address, parseUSDC(0.5))
    await deposit(parseUSDC(1), { wallet: other })
    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(1), 1, parseUSDC(0.5), DAY, borrower, DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(1.5), borrower)
    await mint(1)
    expect(await portfolio.balanceOf(wallet.address)).to.equal(1)
    expect(await token.balanceOf(portfolio.address)).to.equal((parseUSDC(1.5)).add(2))
    expect(await portfolio.virtualTokenBalance()).to.equal((parseUSDC(1.5)).add(2))
  })

  it('does not allow portfolio to be mint receiver', async () => {
    const { portfolio, token } = await loadFixture(flexiblePortfolioFixture)
    await token.approve(portfolio.address, parseUSDC(amount))
    await expect(portfolio.mint(parseUSDC(amount), portfolio.address)).to.be.revertedWith('FP:Wrong receiver/owner')
  })

  it('updates last protocol fee rate', async () => {
    const { portfolio, mint, parseShares, protocolConfig, fpProtocolFeeRate } = await loadFixture(flexiblePortfolioFixture)
    const newFeeRate = 100
    await protocolConfig.setProtocolFeeRate(newFeeRate)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(fpProtocolFeeRate)

    await mint(parseShares(amount))
    expect(await portfolio.lastProtocolFeeRate()).to.equal(newFeeRate)
  })

  it('updates last manager fee rate', async () => {
    const { portfolio, mint, parseShares, fpManagerFeeRate, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    const newFeeRate = 100
    await setManagerFeeRate(newFeeRate)
    expect(await portfolio.lastManagerFeeRate()).to.equal(fpManagerFeeRate)

    await mint(parseShares(amount))
    expect(await portfolio.lastManagerFeeRate()).to.equal(newFeeRate)
  })

  it('emits a Deposit event', async () => {
    const { portfolio, wallet, mint, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await expect(mint(parseShares(80)))
      .to.emit(portfolio, 'Deposit')
      .withArgs(wallet.address, wallet.address, parseUSDC(80), parseShares(80))
  })

  it('pays accrued fee', async () => {
    const { token, mint, protocolConfig, protocolTreasury, executeAndSetNextTimestamp, parseShares, setManagerFeeRate, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(mint(parseShares(amount)), YEAR / 2)
    await mint(parseShares(amount))
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.025))
  })

  it('decreases totalAssets by protocol fee', async () => {
    const { portfolio, mint, protocolConfig, executeAndSetNextTimestamp, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(mint(parseShares(amount)), YEAR / 2)
    await mint(parseShares(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 2 * 0.95))
  })

  it('decreases totalAssets by continuous manager fee', async () => {
    const { portfolio, mint, setManagerFeeRate, executeAndSetNextTimestamp, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(mint(parseShares(amount)), YEAR / 2)
    await mint(parseShares(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 2 * 0.975))
  })

  it('decreases totalAssets by both fees', async () => {
    const { portfolio, mint, protocolConfig, executeAndSetNextTimestamp, parseShares, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(mint(parseShares(amount)), YEAR / 2)
    await mint(parseShares(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 2 * 0.925))
  })

  it('protocol fee exceeds liquidity', async () => {
    const { portfolio, mint, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, parseShares, setManagerFeeRate, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await mint(parseShares(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 2, wallet)
    await mint(1, wallet, wallet, txTimestamp + YEAR / 2)
    expect(await token.balanceOf(protocolTreasury)).to.equal(1)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(0)
    expect(await portfolio.unpaidProtocolFee()).to.equal(parseUSDC(amount * 0.05).sub(1))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('manager fee exceeds liquidity', async () => {
    const { portfolio, mint, addAndFundBulletLoan, wallet, parseShares, setManagerFeeRate, token, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await mint(parseShares(amount))
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 2, wallet)
    await mint(1, wallet, wallet, txTimestamp + YEAR / 2)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(1)
    expect(await portfolio.unpaidManagerFee()).to.equal(parseUSDC(amount * 0.025).sub(1))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('prioritizes protocol fee', async () => {
    const { portfolio, mint, setManagerFeeRate, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, managerFeeBeneficiaryAddress, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await mint(parseShares(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 2, wallet)
    await mint(parseUSDC((6 / 9.25).toFixed(6)).sub(1), wallet, wallet, txTimestamp + YEAR / 2)

    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.01))
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
    expect(await portfolio.unpaidManagerFee()).to.equal(parseUSDC(amount * 0.015))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('takes unpaidProtocolFee into consideration', async () => {
    const { portfolio, setNextBlockTimestamp, mint, getTxTimestamp, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await mint(parseShares(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 10, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 4)
    const updateTimestamp = await getTxTimestamp(portfolio.updateAndPayFee())
    await mint(parseShares(amount), wallet, wallet, updateTimestamp + YEAR / 4)
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.025 + amount * 0.975 * 0.025))
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
  })

  it('transfers less assets with fee', async () => {
    const { token, mint, protocolConfig, executeAndSetNextTimestamp, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(mint(parseShares(amount)), YEAR / 2)
    const balanceBefore = await token.balanceOf(wallet.address)
    await mint(parseShares(amount))
    const assetsTransferred = parseUSDC(amount).mul(19).div(20)
    expect(balanceBefore.sub(await token.balanceOf(wallet.address))).to.equal(assetsTransferred)
  })

  it('includes fee in max size', async () => {
    const { deposit, protocolConfig, executeAndSetNextTimestamp, maxSize, mint, portfolio } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(maxSize.div(2)), YEAR / 2)
    const shares = maxSize.div(2).mul(105).div(95)
    await expect(mint(shares)).to.not.be.reverted
    expect(await portfolio.virtualTokenBalance()).to.equal(maxSize)
  })

  it('transfers mint fee to manager fee beneficiary', async () => {
    const { mint, token, parseShares, mockDepositController, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    const onMintFee = 2
    await mockDepositController({ onMint: { assets: parseUSDC(amount - onMintFee), fee: parseUSDC(onMintFee) } })
    await mint(parseShares(amount))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(onMintFee))
  })

  it('returns assets plus mint fee', async () => {
    const { portfolio, token, parseShares, mockDepositController, wallet } = await loadFixture(flexiblePortfolioFixture)
    const onMintFee = 2
    await token.connect(wallet).approve(portfolio.address, parseUSDC(amount + onMintFee))
    await mockDepositController({ onMint: { assets: parseUSDC(amount), fee: parseUSDC(onMintFee) } })
    expect(await portfolio.callStatic.mint(parseShares(amount), wallet.address)).to.equal(parseUSDC(amount + onMintFee))
  })

  it('emits FeePaid event for mint fee', async () => {
    const { mint, mockDepositController, parseShares, managerFeeBeneficiaryAddress, portfolio } = await loadFixture(flexiblePortfolioFixture)
    const onMintFee = 1
    await mockDepositController({ onMint: { assets: parseUSDC(amount - onMintFee), fee: parseUSDC(onMintFee) } })
    await expect(mint(parseShares(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, parseUSDC(onMintFee))
  })

  it('transfers mint fee from sender to manager fee beneficiary', async () => {
    const { mint, parseShares, wallet, token, managerFeeBeneficiaryAddress, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    const onMintFee = 1
    await mockDepositController({ onMint: { assets: parseUSDC(amount), fee: parseUSDC(onMintFee) } })
    const balanceBefore = await token.balanceOf(wallet.address)

    await mint(parseShares(amount))

    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.sub(parseUSDC(amount).add(parseUSDC(onMintFee))))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(onMintFee))
  })

  it('emits FeePaid event for protocol fee', async () => {
    const { mint, parseShares, protocolConfig, executeAndSetNextTimestamp, portfolio, protocolTreasury } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(mint(parseShares(amount)), YEAR / 2)
    await expect(mint(parseShares(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(protocolTreasury, parseUSDC(amount * 0.05))
  })

  it('emits FeePaid event for continuous manager fee', async () => {
    const { mint, parseShares, setManagerFeeRate, executeAndSetNextTimestamp, portfolio, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(mint(parseShares(amount)), YEAR / 2)
    await expect(mint(parseShares(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, parseUSDC(amount * 0.025))
  })

  it('pays unpaid continuous fees', async () => {
    const { portfolio, token, protocolTreasury, executeAndSetNextTimestamp, managerFeeBeneficiaryAddress, mint, parseShares, deposit, setNextBlockTimestamp, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, wallet } = await loadFixture(flexiblePortfolioFixture)
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
    await mint(parseShares(amount))
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05).add(accruedProtocolFee))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.025).add(accruedManagerFee))
  })

  describe('prioritizes mint fee over continuous fees', () => {
    it('part of protocol fee is paid', async () => {
      const { portfolio, token, protocolTreasury, managerFeeBeneficiaryAddress, deposit, mint, setNextBlockTimestamp, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, wallet, mockDepositController, parseShares } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
      await setNextBlockTimestamp(txTimestamp + YEAR / 2)

      const accruedProtocolFee = parseUSDC(amount * 0.1).mul(YEAR / 2).div(YEAR)
      const accruedManagerFee = parseUSDC(amount * 0.05).mul(YEAR / 2).div(YEAR)
      const depositFee = accruedProtocolFee.div(4)
      await mockDepositController({ onMint: { assets: accruedProtocolFee.div(4), fee: depositFee } })
      await mint(parseShares(amount))
      expect(await token.balanceOf(protocolTreasury)).to.equal(accruedProtocolFee.div(4))
      expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(depositFee)
      expect(await portfolio.unpaidManagerFee()).to.equal(accruedManagerFee)
      expect(await portfolio.unpaidProtocolFee()).to.equal(accruedProtocolFee.mul(3).div(4))
      expect(await portfolio.virtualTokenBalance()).to.equal(0)
    })

    it('part of manager fee is paid', async () => {
      const { portfolio, token, protocolTreasury, managerFeeBeneficiaryAddress, deposit, mint, setNextBlockTimestamp, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, wallet, mockDepositController, parseShares } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
      await setNextBlockTimestamp(txTimestamp + YEAR / 2)

      const accruedProtocolFee = parseUSDC(amount * 0.1).mul(YEAR / 2).div(YEAR)
      const accruedManagerFee = parseUSDC(amount * 0.05).mul(YEAR / 2).div(YEAR)
      const depositFee = accruedManagerFee.div(4)
      await mockDepositController({ onMint: { assets: accruedProtocolFee.add(accruedManagerFee.div(4)), fee: depositFee } })
      await mint(parseShares(amount))
      expect(await token.balanceOf(protocolTreasury)).to.equal(accruedProtocolFee)
      expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(depositFee.add(accruedManagerFee.div(4)))
      expect(await portfolio.unpaidManagerFee()).to.equal(accruedManagerFee.mul(3).div(4))
      expect(await portfolio.unpaidProtocolFee()).to.equal(0)
      expect(await portfolio.virtualTokenBalance()).to.equal(0)
    })
  })

  it('transfers amount specified in strategy', async () => {
    const { wallet, parseShares, portfolio, token, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    await token.approve(portfolio.address, parseUSDC(50))
    await mockDepositController({ onMint: { assets: parseUSDC(50) } })
    const balanceBefore = await token.balanceOf(wallet.address)
    await portfolio.mint(parseShares(amount), wallet.address)

    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.sub(parseUSDC(50)))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(amount))
  })

  it('fee can exceed assets', async () => {
    const { wallet, parseShares, portfolio, token, mockDepositController, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await token.approve(portfolio.address, parseUSDC(110))
    await mockDepositController({ onMint: { assets: parseUSDC(50), fee: parseUSDC(60) } })
    await portfolio.mint(parseShares(amount), wallet.address)

    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(60))
    expect(await portfolio.virtualTokenBalance()).to.equal(parseUSDC(50))
  })

  it('deposited assets cannot be 0 after fee', async () => {
    const { wallet, parseShares, portfolio, token, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    await token.approve(portfolio.address, parseUSDC(60))
    await mockDepositController({ onMint: { assets: parseUSDC(0), fee: parseUSDC(60) } })
    await expect(portfolio.mint(parseShares(amount), wallet.address))
      .to.be.revertedWith('FP:Operation not allowed')
  })
})
