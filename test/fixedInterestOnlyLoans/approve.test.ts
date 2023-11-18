import { setupFixtureLoader } from 'test/setup'
import { fixedInterestOnlyLoansFixture } from 'fixtures'
import { expect } from 'chai'

describe('FixedInterestOnlyLoans.approve', () => {
  const loadFixture = setupFixtureLoader()

  it('approve reverts if paused', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, other } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await fixedInterestOnlyLoans.pause()

    await expect(fixedInterestOnlyLoans.approve(other.address, 0)).to.be.revertedWith('Pausable: paused')
  })

  it('approve sets approval', async () => {
    const { fixedInterestOnlyLoans, issueAndStart, another } = await loadFixture(fixedInterestOnlyLoansFixture)

    await issueAndStart()
    await fixedInterestOnlyLoans.approve(another.address, 0)

    expect(await fixedInterestOnlyLoans.getApproved(0)).to.be.eq(another.address)
  })
})
