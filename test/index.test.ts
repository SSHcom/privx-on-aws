import * as cdk from '@aws-cdk/core'
import { Stack } from '../src/index'

test('stack spawns required resources', () => {
  const app = new cdk.App()
  new Stack(app, 'test-stack', {})
})
