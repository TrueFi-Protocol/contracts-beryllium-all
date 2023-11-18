import { expect } from 'chai'
import { BigNumber } from 'ethers'
import { setupFixtureLoader } from 'test/setup'
import { getTxTimestamp, parseUSDC } from 'utils'
import { DAY, YEAR } from 'utils/constants'
import { flexiblePortfolioFixture, bulletLoansValuationStrategyFixture, Status } from 'fixtures'
import { assertEqualArrays } from 'utils/assertEqualArrays'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

const repaymentAmount = parseUSDC(6)
const principalAmount = parseUSDC(5)
const periodicPaymentAmount = parseUSDC(6)
const periodCount = 30
const gracePeriod = DAY
const liquidity = parseUSDC(10)

describe('FlexiblePortfolio.fundInstrument', () => {
  const loadFixture = setupFixtureLoader()

  it('fund existing bullet loan', async () => {
    const { portfolio, borrower, token, deposit, bulletLoans, provider, addBulletLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(liquidity)

    await addBulletLoan(principalAmount, repaymentAmount, DAY, borrower)

    const tx = await portfolio.fundInstrument(bulletLoans.address, 0)
    const timestamp = await getTxTimestamp(tx, provider)

    expect(await token.balanceOf(borrower.address)).to.equal(principalAmount)
    expect(await token.balanceOf(portfolio.address)).to.equal(liquidity.sub(principalAmount))
    expect(await portfolio.virtualTokenBalance()).to.equal(liquidity.sub(principalAmount))
    assertEqualArrays(await bulletLoans.loans(0), [
      token.address,
      Status.Started,
      BigNumber.from(DAY),
      BigNumber.from(timestamp).add(DAY),
      borrower.address,
      principalAmount,
      repaymentAmount,
      BigNumber.from(0),
    ])
  })

  it('fund existing fixed interest only loan', async () => {
    const { portfolio, borrower, token, deposit, fixedInterestOnlyLoans, addFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    const liquidity = parseUSDC(10)
    await deposit(liquidity)

    await addFixedInterestOnlyLoan(principalAmount, periodCount, periodicPaymentAmount, DAY, borrower, gracePeriod)

    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)

    await portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0)

    expect(await token.balanceOf(borrower.address)).to.equal(principalAmount)
    expect(await token.balanceOf(portfolio.address)).to.equal(liquidity.sub(principalAmount))
    expect(await portfolio.virtualTokenBalance()).to.equal(liquidity.sub(principalAmount))
  })

  it('doesn\'t fund non-existing loan', async () => {
    const { portfolio, bulletLoans } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.fundInstrument(bulletLoans.address, 0)).to.be.revertedWith('FP:Instrument not added')
  })

  it('reverts if not enough funds in portfolio', async () => {
    const { portfolio, borrower, fixedInterestOnlyLoans, addFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    await addFixedInterestOnlyLoan(principalAmount, periodCount, periodicPaymentAmount, DAY, borrower, gracePeriod)

    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)

    await expect(portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0)).to.be.revertedWith('FP:Not enough liquidity')
  })

  it('reverts if debt instrument ends after portfolio end date', async () => {
    const { portfolio, borrower, fixedInterestOnlyLoans, addFixedInterestOnlyLoan, deposit } = await loadFixture(flexiblePortfolioFixture)

    await deposit(liquidity)

    await addFixedInterestOnlyLoan(principalAmount, periodCount, periodicPaymentAmount, YEAR, borrower, gracePeriod)

    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)

    await expect(portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0)).to.be.revertedWith('FP:Instrument has bigger endDate')
  })

  it('updates last protocol fee rate', async () => {
    const { portfolio, borrower, deposit, protocolConfig, fpProtocolFeeRate, addAndFundBulletLoan } = await loadFixture(flexiblePortfolioFixture)
    await deposit(liquidity)
    const newFeeRate = 100
    await protocolConfig.setProtocolFeeRate(newFeeRate)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(fpProtocolFeeRate)

    await addAndFundBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    expect(await portfolio.lastProtocolFeeRate()).to.equal(newFeeRate)
  })

  it('updates last manager fee', async () => {
    const { portfolio, borrower, deposit, fpManagerFeeRate, addAndFundBulletLoan, setManagerFeeRate } = await loadFixture(flexiblePortfolioFixture)
    await deposit(liquidity)
    const newFeeRate = 100
    await setManagerFeeRate(newFeeRate)
    expect(await portfolio.lastManagerFeeRate()).to.equal(fpManagerFeeRate)

    await addAndFundBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    expect(await portfolio.lastManagerFeeRate()).to.equal(newFeeRate)
  })

  it('emits an event', async () => {
    const { portfolio, borrower, deposit, bulletLoans, addBulletLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(liquidity)

    await addBulletLoan(principalAmount, repaymentAmount, DAY, borrower)

    await expect(portfolio.fundInstrument(bulletLoans.address, 0))
      .to.emit(portfolio, 'InstrumentFunded')
      .withArgs(bulletLoans.address, 0)
  })

  it('is available only for the manager', async () => {
    const { portfolio, other: borrower, deposit, bulletLoans, addBulletLoan, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)

    await deposit(liquidity)

    await addBulletLoan(principalAmount, repaymentAmount, DAY, borrower)

    await expect(portfolio.connect(borrower).fundInstrument(bulletLoans.address, 0))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(borrower, MANAGER_ROLE))
  })

  it('changes loan\'s status while funding', async () => {
    const { portfolio, borrower, deposit, fixedInterestOnlyLoans, FixedInterestOnlyLoanStatus, addFixedInterestOnlyLoan } = await loadFixture(flexiblePortfolioFixture)

    await deposit(liquidity)

    await addFixedInterestOnlyLoan(principalAmount, periodCount, periodicPaymentAmount, DAY, borrower, gracePeriod)

    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Created)

    await fixedInterestOnlyLoans.connect(borrower).acceptLoan(0)

    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Accepted)

    await portfolio.fundInstrument(fixedInterestOnlyLoans.address, 0)

    expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Started)
  })

  it('adds bullet loan to valuation strategy', async () => {
    const { portfolio, borrower, addAndFundBulletLoan, deposit, valuationStrategy } = await loadFixture(bulletLoansValuationStrategyFixture)

    await deposit(liquidity)
    await addAndFundBulletLoan(principalAmount, repaymentAmount, DAY, borrower)

    expect(await valuationStrategy.calculateValue(portfolio.address)).to.equal(principalAmount)
  })

  it('pays accruedFee', async () => {
    const { borrower, addAndFundBulletLoan, deposit, protocolConfig, protocolTreasury, token, executeAndSetNextTimestamp, setManagerFeeRate, managerFeeBeneficiaryAddress } = await loadFixture(bulletLoansValuationStrategyFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    await addAndFundBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    expect(await token.balanceOf(protocolTreasury)).to.equal(liquidity.div(20))
    expect(await token.balanceOf(managerFeeBeneficiaryAddress)).to.equal(liquidity.div(40))
  })

  it('decreases totalAssets by protocol fee', async () => {
    const { borrower, addAndFundBulletLoan, deposit, protocolConfig, portfolio, executeAndSetNextTimestamp } = await loadFixture(bulletLoansValuationStrategyFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    await addAndFundBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    expect(await portfolio.totalAssets()).to.equal(liquidity.div(20).mul(19))
  })

  it('decreases totalAssets by manager continuous fee', async () => {
    const { borrower, addAndFundBulletLoan, deposit, setManagerFeeRate, portfolio, executeAndSetNextTimestamp } = await loadFixture(bulletLoansValuationStrategyFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    await addAndFundBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    expect(await portfolio.totalAssets()).to.equal(liquidity.div(40).mul(39))
  })

  it('decreases totalAssets by both fees', async () => {
    const { borrower, addAndFundBulletLoan, deposit, setManagerFeeRate, protocolConfig, portfolio, executeAndSetNextTimestamp } = await loadFixture(bulletLoansValuationStrategyFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    await addAndFundBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    expect(await portfolio.totalAssets()).to.equal(liquidity.div(40).mul(37))
  })

  it('fees exceed liquidity', async () => {
    const { borrower, addAndFundBulletLoan, deposit, protocolConfig, executeAndSetNextTimestamp, setManagerFeeRate } = await loadFixture(bulletLoansValuationStrategyFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    const protocolFee = liquidity.div(20)
    const managerFee = liquidity.div(40)
    await expect(addAndFundBulletLoan(liquidity.sub(protocolFee).sub(managerFee).add(1), liquidity.add(1), DAY, borrower))
      .to.be.revertedWith('FP:Not enough liquidity')
  })

  it('principal exceeds liquidity minus fees', async () => {
    const { borrower, addAndFundBulletLoan, deposit, protocolConfig, executeAndSetNextTimestamp, setManagerFeeRate } = await loadFixture(bulletLoansValuationStrategyFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    const fee = liquidity.div(20)
    await expect(addAndFundBulletLoan(liquidity.sub(fee).add(1), liquidity, DAY, borrower))
      .to.be.revertedWith('FP:Not enough liquidity')
  })

  it('emits FeePaid events for protocol fee', async () => {
    const { bulletLoans, addBulletLoan, deposit, borrower, protocolConfig, portfolio, executeAndSetNextTimestamp, protocolTreasury } = await loadFixture(bulletLoansValuationStrategyFixture)
    await protocolConfig.setProtocolFeeRate(1000)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    await addBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    await expect(portfolio.fundInstrument(bulletLoans.address, 0))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(protocolTreasury, liquidity.div(20))
  })

  it('emits FeePaid event for continuous manager fee', async () => {
    const { bulletLoans, addBulletLoan, deposit, borrower, setManagerFeeRate, portfolio, executeAndSetNextTimestamp, managerFeeBeneficiaryAddress } = await loadFixture(bulletLoansValuationStrategyFixture)
    await setManagerFeeRate(500)
    await executeAndSetNextTimestamp((deposit(liquidity)), YEAR / 2)
    await addBulletLoan(principalAmount, repaymentAmount, DAY, borrower)
    await expect(portfolio.fundInstrument(bulletLoans.address, 0))
      .to.emit(portfolio, 'FeePaid')
      .withArgs(managerFeeBeneficiaryAddress, liquidity.div(40))
  })
})
