import { expect } from 'chai'
import { globalWhitelistLenderVerifierWrapperFixture } from 'fixtures/globalWhitelistLenderVerifierWrapperFixture'
import { setupFixtureLoader } from 'test/setup'

describe('GlobalWhitelistLenderVerifierWrapper.constructor', () => {
  const loadFixture = setupFixtureLoader()

  it('sets GlobalWhitelistLenderVerifier', async () => {
    const { globalWhitelistLenderVerifierWrapper, globalWhitelistLenderVerifier } = await loadFixture(globalWhitelistLenderVerifierWrapperFixture)
    expect(await globalWhitelistLenderVerifierWrapper.globalWhitelistLenderVerifier())
      .to.eq(globalWhitelistLenderVerifier.address)
  })
})
