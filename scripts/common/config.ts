import { env } from './env'

export const config = {
  deploymentsFile: 'build/deployments.json',
  basicContract: {
    a: env('A', 1),
  },
}
