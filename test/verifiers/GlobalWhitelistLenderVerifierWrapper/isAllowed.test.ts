import { expect } from 'chai'
import { globalWhitelistLenderVerifierWrapperFixture } from 'fixtures/globalWhitelistLenderVerifierWrapperFixture'
import { setupFixtureLoader } from 'test/setup'

describe('GlobalWhitelistLenderVerifierWrapper.isAllowed', () => {
  const loadFixture = setupFixtureLoader()

  it('does not allow address not added to whitelist', async () => {
    const { globalWhitelistLenderVerifierWrapper, other } = await loadFixture(globalWhitelistLenderVerifierWrapperFixture)
    expect(await globalWhitelistLenderVerifierWrapper.isAllowed(other.address)).to.eq(false)
  })

  it('allows address added to whitelist', async () => {
    const { globalWhitelistLenderVerifierWrapper, globalWhitelistLenderVerifier, other } = await loadFixture(globalWhitelistLenderVerifierWrapperFixture)
    await globalWhitelistLenderVerifier.setWhitelistStatus(other.address, true)
    expect(await globalWhitelistLenderVerifierWrapper.isAllowed(other.address)).to.eq(true)
  })
})
