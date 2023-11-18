import { setupFixtureLoader } from 'test/setup'
import { flexiblePortfolioFixture } from 'fixtures'
import { DAY, parseUSDC } from 'utils'
import { expect } from 'chai'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

const principalAmount = parseUSDC(5)
const periodPaymentAmount = parseUSDC(5)
const periodsCount = 12
const periodDuration = DAY * 30

describe('FlexiblePortfolio.updateInstrument', () => {
  const loadFixture = setupFixtureLoader()

  it('updates fixed interest only loan', async () => {
    const { fixedInterestOnlyLoans, portfolio, deposit, addAcceptFundFixedInterestOnlyLoan, another } = await loadFixture(flexiblePortfolioFixture)

    await deposit(parseUSDC(10))
    const { loanId } = await addAcceptFundFixedInterestOnlyLoan(principalAmount, periodsCount, periodPaymentAmount, periodDuration, another, DAY)

    expect(await fixedInterestOnlyLoans.gracePeriod(loanId)).to.equal(DAY)
    const data = fixedInterestOnlyLoans.interface.encodeFunctionData('updateInstrument', [loanId, DAY * 2])

    await portfolio.updateInstrument(fixedInterestOnlyLoans.address, data)

    expect(await fixedInterestOnlyLoans.gracePeriod(loanId)).to.equal(DAY * 2)
  })

  it('emits an event', async () => {
    const { fixedInterestOnlyLoans, portfolio, deposit, addAcceptFundFixedInterestOnlyLoan, another } = await loadFixture(flexiblePortfolioFixture)

    await deposit(parseUSDC(10))
    const { loanId } = await addAcceptFundFixedInterestOnlyLoan(principalAmount, periodsCount, periodPaymentAmount, periodDuration, another, DAY)

    const data = fixedInterestOnlyLoans.interface.encodeFunctionData('updateInstrument', [loanId, DAY * 2])
    await expect(portfolio.updateInstrument(fixedInterestOnlyLoans.address, data))
      .to.emit(portfolio, 'InstrumentUpdated')
      .withArgs(fixedInterestOnlyLoans.address)
  })

  it('cannot add instrument on unknown contract', async () => {
    const { portfolio, token } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.updateInstrument(token.address, '0x00'))
      .to.be.revertedWith('FP:Instrument not allowed')
  })

  it('cannot call unexpected methods on known contract', async () => {
    const { portfolio, bulletLoans } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.updateInstrument(bulletLoans.address, '0x00'))
      .to.be.revertedWith('FP:Invalid function call')
  })

  it('can be called only by manager', async () => {
    const { portfolio, bulletLoans, other, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.connect(other).updateInstrument(bulletLoans.address, '0x00'))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, MANAGER_ROLE))
  })
})
