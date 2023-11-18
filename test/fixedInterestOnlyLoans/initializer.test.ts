import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'

describe('FixedInterestOnlyLoans.initializer', () => {
  const loadFixture = setupFixtureLoader()

  it('sets default admin', async () => {
    const { fixedInterestOnlyLoans, owner, DEFAULT_ADMIN_ROLE } = await loadFixture(fixedInterestOnlyLoansFixture)
    expect(await fixedInterestOnlyLoans.hasRole(DEFAULT_ADMIN_ROLE, owner.address)).to.be.true
  })

  it('sets ERC721 name and symbol', async () => {
    const { fixedInterestOnlyLoans } = await loadFixture(fixedInterestOnlyLoansFixture)

    expect(await fixedInterestOnlyLoans.name()).to.equal('FixedInterestOnlyLoans')
    expect(await fixedInterestOnlyLoans.symbol()).to.equal('FIOL')
  })
})
