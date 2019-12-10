import { expect, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { Config, Stack } from '../src/index'

test('config spawns required resources', () => {
  const app = new cdk.App()
  const stack = new Config(app, 'test-config', {})
  const elements: string[] = [
    'AWS::SecretsManager::Secret',
  ]
  elements.forEach(x => expect(stack).to(haveResource(x)))
})

test('stack spawns required resources', () => {
  const app = new cdk.App()
  new Stack(app, 'test-stack', {})
})
