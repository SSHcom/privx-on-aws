import { expect as stackExpect, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import * as net from '../src/net'

test('configure vpc', () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'test', {})
  net.Vpc(stack, '10.0.0.0/16')

  const elements: string[] = [
    'AWS::EC2::VPC',
  ]
  elements.forEach(x => stackExpect(stack).to(haveResource(x)))
})

test('invalid vpc configure', () => {
  const t = () => {
    const app = new cdk.App()
    const stack = new cdk.Stack(app, 'test', {})
    net.Vpc(stack, '192.168.0.0/16')
  }
  expect(t).toThrow(Error)
})
