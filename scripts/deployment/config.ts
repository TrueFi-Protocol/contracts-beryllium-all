import { env } from '../common/env'

export const config = {
  infuraKey: '5be498e94afe494897c88427fcb3e42a',
  deploymentsFile: 'build/deployments.json',
  protocolConfig: {
    mainnet: {
      protocolFee: env('PROTOCOL_FEE', 50), // 50 BIPS = 0,5%
      protocolAdmin: env('PROTOCOL_ADMIN', '0xd8d337aA9aa8DF439b404472031277ceBF57AB3A'), // Dev private key
      protocolTreasury: env('PROTOCOL_TREASURY', '0x4f4AC7a7032A14243aEbDa98Ee04a5D7Fe293d07'), // DAO Treasury timelock
      pauserAddress: env('PAUSER_ADDRESS', '0xd8d337aA9aa8DF439b404472031277ceBF57AB3A'), // Dev private key
    },
    optimism: {
      protocolFee: env('PROTOCOL_FEE', 50), // 50 BIPS = 0,5%
      protocolAdmin: env('PROTOCOL_ADMIN', '0xdb6d3a7b0b373b46ba24017e6a1e0a9624418671'), // Owner multisig
      protocolTreasury: env('PROTOCOL_TREASURY', '0x73581551665680696946f568259977da02e8712a'), // DAO treasury multisig
      pauserAddress: env('PAUSER_ADDRESS', '0xaa99ee681ad313ba8b370f736267853eb2e44b84'), // Config multisig
    },
  },
  flexiblePortfolio: {
    duration: env('FLEXIBLE_PORTFOLIO_DURATION', 365 * 24 * 60 * 60), // 1 year,
    maxSize: env('FLEXIBLE_PORTFOLIO_MAX_SIZE', 10_000_000),
    managerFee: env('FLEXIBLE_PORTFOLIO_MANAGER_FEE', 100), // 1%
  },
  multiFarm: {
    mainnet: '0x01d54167821281b1879Ff6B09D8F8EDc723D2613',
    optimism: '0xBA08042fc72f4be306a935C17FC2a95e1B56a67c',
    goerli: '0x1421D0E1746Be36Bec00207DEfd933Ea51E657a0',
    ganache: '0xDAd243C1D47f25b129001181F09c53F93B66c721',
    optimism_goerli: '0x0D047a09c842A67DC3D2DEaB38f5f3c738D55721',
  },
}
