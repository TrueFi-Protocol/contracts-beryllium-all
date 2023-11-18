import { expect } from 'chai'
import { setupFixtureLoader } from 'test/setup'
import { bulletLoansFixture } from 'fixtures'

describe('BulletLoans', () => {
  const loadFixture = setupFixtureLoader()

  it('is ERC721', async () => {
    const { bulletLoans } = await loadFixture(bulletLoansFixture)
    expect(await bulletLoans.name()).to.equal('BulletLoans')
    expect(await bulletLoans.symbol()).to.equal('BulletLoans')
  })
})
