import { expect } from 'chai'
import { flexiblePortfolioFixture } from 'fixtures/flexiblePortfolioFixture'
import { setupFixtureLoader } from 'test/setup'
import { accessControlMissingRoleRevertMessage } from 'utils/accessControlRevertMessage'

describe('FlexiblePortfolio.setManagerFeeBeneficiary', () => {
  const loadFixture = setupFixtureLoader()

  it('sets beneficiary', async () => {
    const { portfolio, other } = await loadFixture(flexiblePortfolioFixture)
    await portfolio.setManagerFeeBeneficiary(other.address)
    expect(await portfolio.managerFeeBeneficiary()).to.equal(other.address)
  })

  it('reverts when called by non-manager', async () => {
    const { portfolio, other, MANAGER_ROLE } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.connect(other).setManagerFeeBeneficiary(other.address))
      .to.be.revertedWith(accessControlMissingRoleRevertMessage(other, MANAGER_ROLE))
  })

  it('requires new beneficiary to be different', async () => {
    const { portfolio, managerFeeBeneficiaryAddress } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.setManagerFeeBeneficiary(managerFeeBeneficiaryAddress))
      .to.be.revertedWith('FP:Value has to be different')
  })

  it('emits event', async () => {
    const { portfolio, other } = await loadFixture(flexiblePortfolioFixture)
    await expect(portfolio.setManagerFeeBeneficiary(other.address))
      .to.emit(portfolio, 'ManagerFeeBeneficiaryChanged')
      .withArgs(other.address)
  })
})
