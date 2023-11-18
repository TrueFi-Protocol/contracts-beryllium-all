import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { DAY, parseUSDC, YEAR } from 'utils'

describe('FlexiblePortfolio.deposit', () => {
  const loadFixture = setupFixtureLoader()
  const amount = 10

  it('reverts if paused', async () => {
    const { deposit, portfolio } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.pause()
    await expect(deposit(parseUSDC(150))).to.be.revertedWith('Pausable: paused')
  })

  it('does not allow portfolio to be deposit receiver', async () => {
    const { portfolio, wallet, token } = await loadFixture(flexiblePortfolioFixture)
    const amount = 100
    await token.mint(wallet.address, parseUSDC(amount))
    await token.approve(portfolio.address, parseUSDC(amount))
    await expect(portfolio.deposit(parseUSDC(amount), portfolio.address)).to.be.revertedWith('FP:Wrong receiver/owner')
  })

  it('distributes shares to receiver', async () => {
    const { portfolio, parseShares, other, wallet, token } = await loadFixture(flexiblePortfolioFixture)
    const amount = 100
    await token.mint(wallet.address, parseUSDC(amount))
    await token.approve(portfolio.address, parseUSDC(amount))
    await portfolio.connect(wallet).deposit(parseUSDC(amount), other.address)

    expect(await portfolio.balanceOf(other.address)).to.equal(parseShares(amount))
  })

  it('transfers funds from caller', async () => {
    const { portfolio, other, token, wallet } = await loadFixture(flexiblePortfolioFixture)
    const amount = parseUSDC(100)
    await token.mint(wallet.address, amount)
    const balanceBefore = await token.balanceOf(wallet.address)
    await token.approve(portfolio.address, amount)
    await portfolio.connect(wallet).deposit(amount, other.address)
    const balanceAfter = await token.balanceOf(wallet.address)

    expect(balanceBefore.sub(balanceAfter)).to.equal(amount)
  })

  it('transfers funds to portfolio', async () => {
    const { portfolio, wallet, other, token } = await loadFixture(flexiblePortfolioFixture)
    const amount = parseUSDC(100)
    await token.mint(wallet.address, amount)
    await token.approve(portfolio.address, amount)
    await portfolio.connect(wallet).deposit(amount, other.address)

    expect(await token.balanceOf(portfolio.address)).to.equal(amount)
    expect(await portfolio.virtualTokenBalance()).to.equal(amount)
  })

  it('reverts when first deposit is bigger than maxSize', async () => {
    const { deposit } = await loadFixture(flexiblePortfolioFixture)
    const depositAmount = parseUSDC(150)
    await expect(deposit(depositAmount)).to.be.revertedWith('FP:Portfolio is full')
  })

  it('reverts when subsequent deposit is bigger than maxSize', async () => {
    const { deposit } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(80))
    const depositAmount = parseUSDC(30)
    await expect(deposit(depositAmount)).to.be.revertedWith('FP:Portfolio is full')
  })

  it('can deposit when only fee would exceed max size', async () => {
    const { portfolio, deposit, parseShares, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    const fee = 1
    const maxSize = parseUSDC(amount)
    await mockDepositController({ onDeposit: { shares: parseShares(amount), fee: parseUSDC(fee) } })
    await portfolio.setMaxSize(maxSize)
    await deposit(parseUSDC(amount + fee))
    expect(await portfolio.virtualTokenBalance()).to.equal(maxSize)
  })

  it('reverts when depositing past end date', async () => {
    const { deposit, portfolioDuration, timeTravel } = await loadFixture(flexiblePortfolioFixture)

    await timeTravel(portfolioDuration + 1)
    await expect(deposit(parseUSDC(100)))
      .to.be.revertedWith('FP:End date elapsed')
  })

  it('updates last protocol fee rate', async () => {
    const { deposit, portfolio, protocolConfig, fpProtocolFeeRate } = await loadFixture(flexiblePortfolioFixture)
    const newFeeRate = 100
    await protocolConfig.setProtocolFeeRate(newFeeRate)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(fpProtocolFeeRate)

    await deposit(parseUSDC(100))
    expect(await portfolio.lastProtocolFeeRate()).to.equal(newFeeRate)
  })

  it('updates last manager fee rate', async () => {
    const { deposit, portfolio, setManagerFeeRate, fpManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    const newFeeRate = 100
    await setManagerFeeRate(newFeeRate)
    expect(await portfolio.lastManagerFeeRate()).to.equal(fpManagerFeeRate)

    await deposit(parseUSDC(100))
    expect(await portfolio.lastManagerFeeRate()).to.equal(newFeeRate)
  })

  it('emits a Deposit event', async () => {
    const { deposit, parseShares, portfolio, wallet } = await loadFixture(flexiblePortfolioFixture)

    await expect(deposit(parseUSDC(80)))
      .to.emit(portfolio, 'Deposit')
      .withArgs(wallet.address, wallet.address, parseUSDC(80), parseShares(80))
  })

  it('gives fewer LP tokens to second depositor after loan has been funded', async () => {
    const { portfolio, parseShares, wallet, borrower, other, deposit, addAcceptFundFixedInterestOnlyLoan, timeTravel, token, tokenDecimals } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(30))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(30))

    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(30), 1, parseUSDC(10), DAY, borrower, DAY)
    await timeTravel(DAY / 4)

    await token.mint(other.address, parseUSDC(30))
    await deposit(parseUSDC(30), { wallet: other })
    const expectedTokens = parseShares((30 * 30 / (30 + 2.5)).toFixed(tokenDecimals))
    expect(await portfolio.balanceOf(other.address)).to.be.closeTo(expectedTokens, parseShares(0.001))
  })

  it('gives fewer LP tokens to second depositor after repayment has been made', async () => {
    const { portfolio, parseShares, wallet, borrower, other, deposit, addAcceptFundFixedInterestOnlyLoan, repayFixedInterestOnlyLoan, timeTravel, token, tokenDecimals } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(30))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(30))

    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(30), 2, parseUSDC(10), DAY, borrower, DAY)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(10), borrower)

    await token.mint(other.address, parseUSDC(30))
    await timeTravel(DAY / 4)
    await deposit(parseUSDC(30), { wallet: other })
    const expectedTokens = parseShares((30 * 30 / (30 + 10 + 2.5)).toFixed(tokenDecimals))
    expect(await portfolio.balanceOf(other.address)).to.be.closeTo(expectedTokens, parseShares(0.001))
  })

  it('reverts if value has gone to zero', async () => {
    const { portfolio, parseShares, wallet, borrower, other, deposit, addAcceptFundFixedInterestOnlyLoan, timeTravel, token, fixedInterestOnlyLoans } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(20))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(20))

    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 2, parseUSDC(10), DAY, borrower, DAY / 4)
    await timeTravel(DAY + DAY / 2)
    await portfolio.markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)

    await token.mint(other.address, parseUSDC(20))
    await expect(deposit(parseUSDC(20), { wallet: other })).to.be.revertedWith('FP:Infinite value')
  })

  it('does not allow 0 deposit', async () => {
    const { deposit } = await loadFixture(flexiblePortfolioFixture)
    await expect(deposit(parseUSDC(0))).to.be.revertedWith('FP:Operation not allowed')
  })

  it('gives more LP tokens to second depositor if loan default has caused value to decrease', async () => {
    const { portfolio, parseShares, wallet, borrower, other, deposit, addAcceptFundFixedInterestOnlyLoan, timeTravel, token, fixedInterestOnlyLoans, repayFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(20))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(20))

    await addAcceptFundFixedInterestOnlyLoan(parseUSDC(20), 2, parseUSDC(10), DAY, borrower, DAY / 4)
    await timeTravel(DAY)
    await repayFixedInterestOnlyLoan(0, parseUSDC(10), borrower)
    await timeTravel(DAY + DAY / 2)
    await portfolio.markInstrumentAsDefaulted(fixedInterestOnlyLoans.address, 0)

    await token.mint(other.address, parseUSDC(20))
    await deposit(parseUSDC(20), { wallet: other })
    expect(await portfolio.balanceOf(other.address)).to.equal(parseShares(40))
  })

  it('can\'t deposit when not allowed', async () => {
    const { token, deposit, wallet, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(1))
    await mockDepositController({ onDeposit: { shares: 0 } })
    await expect(deposit(parseUSDC(1))).to.be.revertedWith('FP:Operation not allowed')
  })

  it('can deposit when allowed', async () => {
    const { token, deposit, wallet } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(1))
    await expect(deposit(parseUSDC(1))).not.to.be.reverted
  })

  it('calls onDeposit with correct arguments', async () => {
    const { portfolio, wallet, other, token, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    const strategyContract = await mockDepositController({ onDeposit: { shares: 1 } })
    await token.approve(portfolio.address, parseUSDC(1))
    await portfolio.deposit(parseUSDC(1), other.address)
    expect('onDeposit').to.be.calledOnContractWith(strategyContract, [wallet.address, parseUSDC(1), other.address])
  })

  it('returns the number of shares minted', async () => {
    const { portfolio, wallet, token, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await token.mint(wallet.address, parseUSDC(100))
    await token.approve(portfolio.address, parseUSDC(100))
    const sharesMinted = await portfolio.callStatic.deposit(parseUSDC(100), wallet.address)
    expect(sharesMinted).to.equal(parseShares(100))
  })

  it('pays accrued fee', async () => {
    const { token, deposit, protocolConfig, protocolTreasury, executeAndSetNextTimestamp, setManagerFeeRate, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await deposit(parseUSDC(amount))
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.025))
  })

  it('decreases totalAssets by protocol fee', async () => {
    const { portfolio, deposit, protocolConfig, executeAndSetNextTimestamp } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await deposit(parseUSDC(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.95 + amount))
  })

  it('decreases totalAssets by continuous manager fee', async () => {
    const { portfolio, deposit, setManagerFeeRate, executeAndSetNextTimestamp } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await deposit(parseUSDC(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.975 + amount))
  })

  it('decreases totalAssets by both fees', async () => {
    const { portfolio, deposit, protocolConfig, executeAndSetNextTimestamp, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await deposit(parseUSDC(amount))
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.925 + amount))
  })

  it('protocol fee exceeds liquidity', async () => {
    const { portfolio, deposit, setManagerFeeRate, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 2, wallet)
    await deposit(1, { timestamp: txTimestamp + YEAR / 2 })
    expect(await token.balanceOf(protocolTreasury)).to.equal(1)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(0)
    expect(await portfolio.unpaidProtocolFee()).to.equal(parseUSDC(amount * 0.05).sub(1))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('manager fee exceeds liquidity', async () => {
    const { portfolio, deposit, addAndFundBulletLoan, wallet, setManagerFeeRate, token, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 2, wallet)
    await deposit(1, { timestamp: txTimestamp + YEAR / 2 })
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(1)
    expect(await portfolio.unpaidManagerFee()).to.equal(parseUSDC(amount * 0.025).sub(1))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('prioritizes protocol fee', async () => {
    const { portfolio, deposit, setManagerFeeRate, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 2, wallet)
    await deposit(parseUSDC(amount * 0.06), { timestamp: txTimestamp + YEAR / 2 })

    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.01))
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
    expect(await portfolio.unpaidManagerFee()).to.equal(parseUSDC(amount * 0.015))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('takes unpaidProtocolFee into consideration', async () => {
    const { portfolio, getTxTimestamp, deposit, setNextBlockTimestamp, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet } = await loadFixture(flexiblePortfolioFixture)
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), YEAR / 10, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 4)
    const updateTimestamp = await getTxTimestamp(portfolio.updateAndPayFee())
    await deposit(parseUSDC(amount), { timestamp: updateTimestamp + YEAR / 4 })
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.025 + amount * 0.975 * 0.025))
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
  })

  it('mints more shares with fee', async () => {
    const { portfolio, deposit, protocolConfig, executeAndSetNextTimestamp, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await deposit(parseUSDC(amount))
    const newShares = parseShares(amount).mul(20).div(19)
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(amount).add(newShares))
  })

  it('includes fee in max size', async () => {
    const { deposit, protocolConfig, executeAndSetNextTimestamp, maxSize } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(maxSize.div(2)), YEAR / 2)
    const fee = maxSize.div(2).div(20)
    await expect(deposit(maxSize.div(2).add(fee))).to.not.be.reverted
  })

  it('emits FeePaid event for protocol fee', async () => {
    const { deposit, protocolConfig, executeAndSetNextTimestamp, portfolio, protocolTreasury } = await loadFixture(flexiblePortfolioFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(deposit(parseUSDC(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(protocolTreasury, parseUSDC(amount * 0.05))
  })

  it('emits FeePaid event for continuous manager fee', async () => {
    const { deposit, setManagerFeeRate, executeAndSetNextTimestamp, portfolio, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(deposit(parseUSDC(1)))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, parseUSDC(amount * 0.025))
  })

  it('pays deposit fee', async () => {
    const { deposit, parseShares, mockDepositController, portfolio, managerFeeBeneficiaryAddress, token } = await loadFixture(flexiblePortfolioFixture)
    await mockDepositController({ onDeposit: { shares: parseShares(amount), fee: parseUSDC(1) } })
    await deposit(parseUSDC(amount + 1))
    expect(await portfolio.virtualTokenBalance()).to.equal(parseUSDC(10))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(1))
  })

  it('emits FeePaid event for deposit fee', async () => {
    const { deposit, mockDepositController, parseShares, portfolio, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await mockDepositController({ onDeposit: { shares: parseShares(amount), fee: parseUSDC(1) } })
    await expect(deposit(parseUSDC(amount + 1))).to.emit(portfolio, 'FeePaid').withArgs(managerFeeBeneficiaryAddress, parseUSDC(1))
  })

  it('correctly calculates shares with deposit fee', async () => {
    const { deposit, mockDepositController, portfolio, wallet, parseShares } = await loadFixture(flexiblePortfolioFixture)
    await mockDepositController({ onDeposit: { shares: parseShares(amount), fee: parseUSDC(1) } })
    await deposit(parseUSDC(amount + 1))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(amount))
  })

  it('reverts when deposit fee is bigger than assets', async () => {
    const { deposit, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    await mockDepositController({ onDeposit: { shares: 1, fee: parseUSDC(10) } })
    await expect(deposit(parseUSDC(1))).to.revertedWith('FP:Fee bigger than assets')
  })

  it('pays unpaid continuous fees', async () => {
    const { portfolio, token, protocolTreasury, executeAndSetNextTimestamp, managerFeeBeneficiaryAddress, deposit, setNextBlockTimestamp, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, wallet } = await loadFixture(flexiblePortfolioFixture)
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
    await deposit(parseUSDC(amount))
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05).add(accruedProtocolFee))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.025).add(accruedManagerFee))
  })

  describe('prioritizes deposit fee over continuous fees', () => {
    it('part of protocol fee is paid', async () => {
      const { portfolio, token, protocolTreasury, managerFeeBeneficiaryAddress, deposit, setNextBlockTimestamp, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, wallet, mockDepositController, parseShares } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
      await setNextBlockTimestamp(txTimestamp + YEAR / 2)

      const accruedProtocolFee = parseUSDC(amount * 0.1).mul(YEAR / 2).div(YEAR)
      const accruedManagerFee = parseUSDC(amount * 0.05).mul(YEAR / 2).div(YEAR)
      const depositFee = accruedProtocolFee.div(4)
      await mockDepositController({ onDeposit: { shares: parseShares(amount), fee: depositFee } })
      await deposit(accruedProtocolFee.div(2))
      expect(await token.balanceOf(protocolTreasury)).to.equal(accruedProtocolFee.div(4))
      expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(depositFee)
      expect(await portfolio.unpaidManagerFee()).to.equal(accruedManagerFee)
      expect(await portfolio.unpaidProtocolFee()).to.equal(accruedProtocolFee.mul(3).div(4))
      expect(await portfolio.virtualTokenBalance()).to.equal(0)
    })

    it('part of manager fee is paid', async () => {
      const { portfolio, token, protocolTreasury, managerFeeBeneficiaryAddress, deposit, setNextBlockTimestamp, protocolConfig, setManagerFeeRate, addAndFundBulletLoan, wallet, mockDepositController, parseShares } = await loadFixture(flexiblePortfolioFixture)
      await deposit(parseUSDC(amount))
      await protocolConfig.setProtocolFeeRate(1000)
      await setManagerFeeRate(500)
      const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount), parseUSDC(amount), DAY, wallet)
      await setNextBlockTimestamp(txTimestamp + YEAR / 2)

      const accruedProtocolFee = parseUSDC(amount * 0.1).mul(YEAR / 2).div(YEAR)
      const accruedManagerFee = parseUSDC(amount * 0.05).mul(YEAR / 2).div(YEAR)
      const depositFee = accruedManagerFee.div(4)
      await mockDepositController({ onDeposit: { shares: parseShares(amount), fee: depositFee } })
      await deposit(accruedProtocolFee.add(accruedManagerFee.div(2)))

      expect(await token.balanceOf(protocolTreasury)).to.equal(accruedProtocolFee)
      expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(depositFee.add(accruedManagerFee.div(4)))
      expect(await portfolio.unpaidManagerFee()).to.equal(accruedManagerFee.mul(3).div(4))
      expect(await portfolio.unpaidProtocolFee()).to.equal(0)
      expect(await portfolio.virtualTokenBalance()).to.equal(0)
    })
  })

  it('transfers amount specified in strategy', async () => {
    const { wallet, parseShares, portfolio, deposit, token, mockDepositController } = await loadFixture(flexiblePortfolioFixture)
    await mockDepositController({ onDeposit: { shares: parseShares(50) } })
    const balanceBefore = await token.balanceOf(wallet.address)
    await deposit(parseUSDC(amount))

    expect(await token.balanceOf(wallet.address)).to.equal(balanceBefore.sub(parseUSDC(amount)))
    expect(await portfolio.balanceOf(wallet.address)).to.equal(parseShares(50))
  })

  describe('whitelist deposit strategy', () => {
    it('does not allow deposit when not whitelisted', async () => {
      const { other, portfolio, deposit, whitelistDepositController } = await loadFixture(flexiblePortfolioFixture)
      await portfolio.setDepositController(whitelistDepositController.address)
      await expect(deposit(parseUSDC(amount), { wallet: other }))
        .to.be.revertedWith('FP:Operation not allowed')
    })

    it('allows deposit when whitelisted', async () => {
      const { other, portfolio, deposit, whitelistDepositController, parseShares, token } = await loadFixture(flexiblePortfolioFixture)
      await portfolio.setDepositController(whitelistDepositController.address)
      await whitelistDepositController.setWhitelistStatus(portfolio.address, other.address, true)
      await token.mint(other.address, parseUSDC(amount))
      await deposit(parseUSDC(amount), { wallet: other })
      expect(await portfolio.balanceOf(other.address)).to.equal(parseShares(amount))
    })
  })
})
