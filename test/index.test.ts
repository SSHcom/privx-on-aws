//
//   Copyright 2019 SSH Communications Security Corp., All Rights Reserved
//
//   Licensed under the Apache License, Version 2.0 (the "License");
//   you may not use this file except in compliance with the License.
//   You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
//   Unless required by applicable law or agreed to in writing, software
//   distributed under the License is distributed on an "AS IS" BASIS,
//   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//   See the License for the specific language governing permissions and
//   limitations under the License.
//
import { expect, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { Service } from '../src/stack'

const resources: string[] = [
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
  'AWS::SNS::Topic',
  'AWS::CloudWatch::Alarm',
  'AWS::Lambda::Function',
  'AWS::IAM::Policy',
  'AWS::IAM::Role',
  'AWS::Route53::RecordSet',
  'AWS::ElasticLoadBalancingV2::TargetGroup',
  'AWS::ElasticLoadBalancingV2::ListenerRule',
  'AWS::ElasticLoadBalancingV2::LoadBalancer',
  'AWS::ElasticLoadBalancingV2::Listener',
  'AWS::AutoScaling::AutoScalingGroup',
  'AWS::CloudWatch::Alarm',
]

test('stack spawns required resources', () => {
  const app = new cdk.App({ context: { domain: 'example.com' }})
  const stack = new Service(app, 'test-stack', {
    env: { account: '000000000000', region: 'us-east-1'},
  })
  resources.forEach(x => expect(stack).to(haveResource(x)))
})

test('stack spawns required resources in public subnet', () => {
  const app = new cdk.App({ context: {
    domain: 'example.com',
    public: 'on',
  }})
  const stack = new Service(app, 'test-stack', {
    env: { account: '000000000000', region: 'us-east-1'},
  })
  resources.forEach(x => expect(stack).to(haveResource(x)))
})

test('stack spawns required resources in public subnet with custom certificate', () => {
  const app = new cdk.App({ context: {
    domain: 'example.com',
    public: 'on',
    cert: 'arn:aws:acm:us-east-1:000000000000:certificate/12345678-1234-1234-1234-123456789012',
  }})
  const stack = new Service(app, 'test-stack', {
    env: { account: '000000000000', region: 'us-east-1'},
  })
  resources.filter(x => (
    [
      'AWS::Lambda::Function',
    ].indexOf(x) == -1
  )).forEach(x => expect(stack).to(haveResource(x)))
})
