import { deploy } from 'ethereum-mars'
import { deployBeryllium } from './deployBeryllium'

deploy({ verify: true }, (deployer, options) => deployBeryllium(deployer, options, 'beryllium_'))
