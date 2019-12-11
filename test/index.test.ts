import { expect, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { AwsRegionServices, Stack } from '../src/index'

//
//
test('config spawns required resources', () => {
  const app = new cdk.App()
  const stack = new AwsRegionServices(app, 'test-config', {})
  const elements: string[] = [
    'AWS::SecretsManager::Secret',
    'AWS::EC2::VPC',
    'AWS::EC2::Subnet',
    'AWS::EC2::RouteTable',
    'AWS::EC2::SubnetRouteTableAssociation',
    'AWS::EC2::Route',
    'AWS::EC2::EIP',
    'AWS::EC2::NatGateway',
    'AWS::RDS::DBInstance',
  ]
  elements.forEach(x => expect(stack).to(haveResource(x)))
})

test('stack spawns required resources', () => {
  const app = new cdk.App()
  const services = new AwsRegionServices(app, 'test-config', {})
  new Stack(app, 'test-stack', { services })
})
