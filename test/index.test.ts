import { expect, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { AwsRegionServices, Service } from '../src/stack'

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
    'AWS::ElastiCache::SubnetGroup',
    'AWS::ElastiCache::CacheCluster',
    'AWS::EFS::FileSystem',
    'AWS::EFS::MountTarget',
  ]
  elements.forEach(x => expect(stack).to(haveResource(x)))
})

test('stack spawns required resources', () => {
  const app = new cdk.App({ context: { domain: 'example.com' }})
  const services = new AwsRegionServices(app, 'test-config', {
    env: { account: '000000000000', region: 'us-east-1'},
  })
  const stack = new Service(app, 'test-stack', {
    env: { account: '000000000000', region: 'us-east-1'},
    services,
  })
  const elements: string[] = [
    'AWS::Lambda::Function',
    'AWS::IAM::Policy',
    'AWS::IAM::Role',
    'AWS::Route53::RecordSet',
    'AWS::ElasticLoadBalancingV2::TargetGroup',
    'AWS::ElasticLoadBalancingV2::ListenerRule',
    'AWS::ElasticLoadBalancingV2::LoadBalancer',
    'AWS::ElasticLoadBalancingV2::Listener',
    'AWS::AutoScaling::AutoScalingGroup',
  ]
  elements.forEach(x => expect(stack).to(haveResource(x)))
})
