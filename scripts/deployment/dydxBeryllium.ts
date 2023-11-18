import { deploy } from 'ethereum-mars'
import { deployDydxBeryllium } from './deployDydxBeryllium'

deploy({ verify: true }, (deployer, options) => deployDydxBeryllium(deployer, options, 'beryllium_'))
