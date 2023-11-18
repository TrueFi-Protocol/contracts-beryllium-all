import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'

describe('FixedInterestOnlyLoans.transferFrom', () => {
  const loadFixture = setupFixtureLoader()

  it('transferFrom reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, owner, other } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await fixedInterestOnlyLoans.pause()

    await expect(fixedInterestOnlyLoans.transferFrom(owner.address, other.address, 0)).to.be.revertedWith('Pausable: paused')
  })

  it('transferFrom transfers token when not paused', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, owner, another } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await fixedInterestOnlyLoans.transferFrom(owner.address, another.address, 0)

    expect(await fixedInterestOnlyLoans.ownerOf(0)).to.be.eq(another.address)
  })
})
