import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { parseUSDC } from 'utils/parseUSDC'

describe('FixedInterestOnlyLoans.loanProperties', () => {
  const loadFixture = setupFixtureLoader()

  describe('principal', () => {
    it('reverts if accessing non-existing loan', async () => {
      const { fixedInterestOnlyLoans } = await loadFixture(fixedInterestOnlyLoansFixture)

      await expect(fixedInterestOnlyLoans.principal(123)).to.be.revertedWith('panic code 0x32')
    })

    it('returns loan principal', async () => {
      const { fixedInterestOnlyLoans, issueLoan } = await loadFixture(fixedInterestOnlyLoansFixture)
      await issueLoan()

      expect(await fixedInterestOnlyLoans.principal(0)).to.equal(parseUSDC(100))
    })
  })

  describe('asset', () => {
    it('reverts if accessing non-existing loan', async () => {
      const { fixedInterestOnlyLoans } = await loadFixture(fixedInterestOnlyLoansFixture)

      await expect(fixedInterestOnlyLoans.asset(69)).to.be.revertedWith('panic code 0x32')
    })

    it('returns underlying token', async () => {
      const { fixedInterestOnlyLoans, issueLoan, token } = await loadFixture(fixedInterestOnlyLoansFixture)
      await issueLoan()

      expect(await fixedInterestOnlyLoans.asset(0)).to.equal(token.address)
    })
  })

  describe('recipient', () => {
    it('reverts if accessing non-existing loan', async () => {
      const { fixedInterestOnlyLoans } = await loadFixture(fixedInterestOnlyLoansFixture)

      await expect(fixedInterestOnlyLoans.recipient(78)).to.be.revertedWith('panic code 0x32')
    })

    it('returns recipient', async () => {
      const { fixedInterestOnlyLoans, issueLoan, borrower } = await loadFixture(fixedInterestOnlyLoansFixture)
      await issueLoan()

      expect(await fixedInterestOnlyLoans.recipient(0)).to.equal(borrower.address)
    })
  })

  describe('gracePeriod', () => {
    it('reverts if accessing non-existing loan', async () => {
      const { fixedInterestOnlyLoans } = await loadFixture(fixedInterestOnlyLoansFixture)

      await expect(fixedInterestOnlyLoans.gracePeriod(42)).to.be.revertedWith('panic code 0x32')
    })

    it('returns grace period', async () => {
      const { fixedInterestOnlyLoans, issueLoan, defaultLoanParams: { gracePeriod } } = await loadFixture(fixedInterestOnlyLoansFixture)
      await issueLoan()

      expect(await fixedInterestOnlyLoans.gracePeriod(0)).to.equal(gracePeriod)
    })
  })

  describe('status', () => {
    it('reverts if accessing non-existing loan', async () => {
      const { fixedInterestOnlyLoans } = await loadFixture(fixedInterestOnlyLoansFixture)

      await expect(fixedInterestOnlyLoans.status(42)).to.be.revertedWith('panic code 0x32')
    })

    it('returns status', async () => {
      const { fixedInterestOnlyLoans, issueLoan, FixedInterestOnlyLoanStatus } = await loadFixture(fixedInterestOnlyLoansFixture)
      await issueLoan()

      expect(await fixedInterestOnlyLoans.status(0)).to.equal(FixedInterestOnlyLoanStatus.Created)
    })
  })
})
