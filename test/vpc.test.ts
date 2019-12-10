import { expect as stackExpect, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import * as vpc from '../src/vpc'

test('configure vpc', () => {
  const app = new cdk.App()
  const stack = new cdk.Stack(app, 'test', {})
  vpc.Silo(stack, '10.0.0.0/16')

  const elements: string[] = [
    'AWS::EC2::VPC',
  ]
  elements.forEach(x => stackExpect(stack).to(haveResource(x)))
})

test('invalid vpc configure', () => {
  const t = () => {
    const app = new cdk.App()
    const stack = new cdk.Stack(app, 'test', {})
    vpc.Silo(stack, '192.168.0.0/16')
  }
  expect(t).toThrow(Error)
})
