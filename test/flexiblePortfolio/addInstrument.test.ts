import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { parseUSDC } from 'utils'
import { YEAR } from 'utils/constants'
import { flexiblePortfolioFixture } from 'fixtures'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

const principalAmount = parseUSDC(5)
const repaymentAmount = parseUSDC(6)

describe('FlexiblePortfolio.addInstrument', () => {
  const loadFixture = setupFixtureLoader()

  it('creates new instrument', async () => {
    const { bulletLoans, other, token, portfolio } = await loadFixture(flexiblePortfolioFixture)

    const data = bulletLoans.interface.encodeFunctionData('createLoan', [token.address, principalAmount, repaymentAmount, YEAR, other.address])
    const tx = await portfolio.addInstrument(bulletLoans.address, data)

    await expect(tx).to.emit(bulletLoans, 'LoanCreated')
  })

  it('emits event', async () => {
    const { portfolio, addBulletLoan, other, bulletLoans } = await loadFixture(flexiblePortfolioFixture)
    await expect(addBulletLoan(parseUSDC(5), parseUSDC(6), YEAR, other))
      .to.emit(portfolio, 'InstrumentAdded')
      .withArgs(bulletLoans.address, 0)
  })

  it('returns instrumentId', async () => {
    const { portfolio, bulletLoans, other, token, addBulletLoan } = await loadFixture(flexiblePortfolioFixture)

    await addBulletLoan(principalAmount, repaymentAmount, YEAR, other)

    const data = bulletLoans.interface.encodeFunctionData('createLoan', [token.address, principalAmount, repaymentAmount, YEAR, other.address])

    expect(await portfolio.callStatic.addInstrument(bulletLoans.address, data)).to.equal(1)
  })

  it('sets isInstrumentAdded', async () => {
    const { portfolio, bulletLoans, other, addBulletLoan } = await loadFixture(flexiblePortfolioFixture)

    expect(await portfolio.isInstrumentAdded(bulletLoans.address, 0)).to.be.false
    await addBulletLoan(principalAmount, repaymentAmount, YEAR, other)
    expect(await portfolio.isInstrumentAdded(bulletLoans.address, 0)).to.be.true
  })

  it('only manager can call', async () => {
    const { portfolio, bulletLoans, other, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.connect(other).addInstrument(bulletLoans.address, '0x00'))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, MANAGER_ROLE))
  })

  it('cannot add instrument on unknown contract', async () => {
    const { portfolio, token } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.addInstrument(token.address, '0x00'))
      .to.be.revertedWith('FP:Instrument not allowed')
  })

  it('cannot call unexpected methods on known contract', async () => {
    const { portfolio, bulletLoans } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.addInstrument(bulletLoans.address, '0x00'))
      .to.be.revertedWith('FP:Invalid function call')
  })

  it('reverts if debt instrument has a different underlying token than portfolio', async () => {
    const { bulletLoans, other, portfolio } = await loadFixture(flexiblePortfolioFixture)

    const data = bulletLoans.interface.encodeFunctionData('createLoan', [portfolio.address, principalAmount, repaymentAmount, YEAR, other.address])
    await expect(portfolio.addInstrument(bulletLoans.address, data))
      .to.be.revertedWith('FP:Token mismatch')
  })

  it('provides revert message when debt creation fails', async () => {
    const { bulletLoans, other, token, portfolio } = await loadFixture(flexiblePortfolioFixture)

    const data = bulletLoans.interface.encodeFunctionData('createLoan', [token.address, principalAmount.mul(10), repaymentAmount, YEAR, other.address])
    await expect(portfolio.addInstrument(bulletLoans.address, data))
      .to.be.revertedWith('BulletLoans: Total debt cannot be less than principal')
  })
})
