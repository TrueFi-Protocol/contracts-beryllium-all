import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC, YEAR } from 'utils'

describe('FlexiblePortfolio.updateAndPayFee', () => {
  const amount = 100
  const fixtureLoader = setupFixtureLoader()
  const loadFixture = () => fixtureLoader(flexiblePortfolioFixture)

  it('reverts when portfolio is paused', async () => {
    const { portfolio } = await loadFixture()
    await portfolio.pause()
    await expect(portfolio.updateAndPayFee())
      .to.be.revertedWith('Pausable: paused')
  })

  it('updates last protocol fee rate', async () => {
    const { portfolio, protocolConfig, fpProtocolFeeRate } = await loadFixture()
    const newFeeRate = 100
    await protocolConfig.setProtocolFeeRate(newFeeRate)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(fpProtocolFeeRate)

    await portfolio.updateAndPayFee()
    expect(await portfolio.lastProtocolFeeRate()).to.equal(newFeeRate)
  })

  it('updates last manager fee rate', async () => {
    const { portfolio, setManagerFeeRate, fpManagerFeeRate } = await loadFixture()
    const newFeeRate = 100
    await setManagerFeeRate(newFeeRate)
    expect(await portfolio.lastManagerFeeRate()).to.equal(fpManagerFeeRate)

    await portfolio.updateAndPayFee()
    expect(await portfolio.lastManagerFeeRate()).to.equal(newFeeRate)
  })

  it('transfers continuous fees', async () => {
    const { deposit, portfolio, protocolTreasury, setManagerFeeRate, managerFeeBeneficiaryAddress, token, executeAndSetNextTimestamp, protocolConfig } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
    expect(await portfolio.unpaidManagerFee()).to.equal(0)
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.025))
  })

  it('protocol fee exceeds liquidity', async () => {
    const { portfolio, deposit, protocolConfig, setManagerFeeRate, managerFeeBeneficiaryAddress, token, protocolTreasury, setNextBlockTimestamp, addAndFundBulletLoan, wallet } = await loadFixture()
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount).sub(5), parseUSDC(amount).sub(5), YEAR / 4, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await token.balanceOf(protocolTreasury)).to.equal(5)
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(0)
    expect(await portfolio.unpaidProtocolFee()).to.equal(parseUSDC(amount * 0.05).sub(5))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('manager fee exceeds liquidity', async () => {
    const { portfolio, deposit, setManagerFeeRate, managerFeeBeneficiaryAddress, token, setNextBlockTimestamp, addAndFundBulletLoan, wallet } = await loadFixture()
    await deposit(parseUSDC(amount))
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount).sub(5), parseUSDC(amount).sub(5), YEAR / 4, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(5)
    expect(await portfolio.unpaidManagerFee()).to.equal(parseUSDC(amount * 0.025).sub(5))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('decreases totalAssets by protocol fee', async () => {
    const { portfolio, deposit, protocolConfig, executeAndSetNextTimestamp } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.95))
  })

  it('decreases totalAssets by manager fee', async () => {
    const { portfolio, deposit, setManagerFeeRate, executeAndSetNextTimestamp } = await loadFixture()
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.975))
  })

  it('decreases totalAssets by continuous fees', async () => {
    const { portfolio, deposit, setManagerFeeRate, protocolConfig, executeAndSetNextTimestamp } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await portfolio.totalAssets()).to.equal(parseUSDC(amount * 0.925))
  })

  it('prioritizes protocol fee', async () => {
    const { portfolio, deposit, setManagerFeeRate, setNextBlockTimestamp, protocolConfig, token, protocolTreasury, addAndFundBulletLoan, wallet, managerFeeBeneficiaryAddress } = await loadFixture()
    await deposit(parseUSDC(amount))
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    const { txTimestamp } = await addAndFundBulletLoan(parseUSDC(amount * 0.94), parseUSDC(amount * 0.94), YEAR / 2, wallet)
    await setNextBlockTimestamp(txTimestamp + YEAR / 2)
    await portfolio.updateAndPayFee()
    expect(await token.balanceOf(protocolTreasury)).to.equal(parseUSDC(amount * 0.05))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(parseUSDC(amount * 0.01))
    expect(await portfolio.unpaidProtocolFee()).to.equal(0)
    expect(await portfolio.unpaidManagerFee()).to.equal(parseUSDC(amount * 0.025).sub(parseUSDC(amount * 0.01)))
    expect(await portfolio.virtualTokenBalance()).to.equal(0)
  })

  it('emits FeePaid event for protocol fee', async () => {
    const { deposit, protocolConfig, executeAndSetNextTimestamp, portfolio, protocolTreasury } = await loadFixture()
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(portfolio.updateAndPayFee()).to.emit(portfolio, 'FeePaid').withArgs(protocolTreasury, parseUSDC(amount * 0.05))
  })

  it('emits FeePaid event for manager fee', async () => {
    const { deposit, setManagerFeeRate, managerFeeBeneficiaryAddress, executeAndSetNextTimestamp, portfolio } = await loadFixture()
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp(deposit(parseUSDC(amount)), YEAR / 2)
    await expect(portfolio.updateAndPayFee()).to.emit(portfolio, 'FeePaid').withArgs(managerFeeBeneficiaryAddress, parseUSDC(amount * 0.025))
  })
})
