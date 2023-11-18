import { ArtifactFrom } from 'ethereum-mars'
import { Contract } from 'ethereum-mars/build/src/syntax/contract'
import { Signer } from 'ethers'

export type Class<T> = T extends {attach(address: string): infer R} ? ((new (...args: any[]) => T) & {connect(address: string, wallet: Signer): R}) : never
export type MarsContract<T = any> = T extends ArtifactFrom<infer R> ? Contract<R> : never;
