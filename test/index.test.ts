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
import { Template } from 'aws-cdk-lib/assertions';
import * as cdk from 'aws-cdk-lib'
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

const spec = {
  env: { account: '000000000000', region: 'us-east-1'},
  uniqueName: 'privx',
  cidr: '10.1.0.0/16',
  email: 'e.x@example.com',
  subdomain: 'subdomain',
  domain: 'example.com',
}

test('stack spawns required resources', () => {
  const app = new cdk.App({ context: { domain: 'example.com' }})
  const stack = new Service(app, 'test-stack', spec)
  const template = Template.fromStack(stack)
  resources.forEach(x => template.hasResource(x, {}))
})

test('stack spawns required resources with custom certificate', () => {
  const app = new cdk.App()
  const stack = new Service(app, 'test-stack', {
    cert: 'arn:aws:acm:us-east-1:000000000000:certificate/12345678-1234-1234-1234-123456789012',
    ...spec,
  })
  const template = Template.fromStack(stack)
  resources.filter(x => (
    [
      'AWS::Lambda::Function',
    ].indexOf(x) == -1
  )).forEach(x => template.hasResource(x, {}))
})

test('stack spawns: blue default, green snapshot', () => {
  const app = new cdk.App()
  const stack = new Service(app, 'test-stack', {
    snapB: 'default',
    snapG: 'arn:aws:rds:us-east-1:000000000000:snapshot:a',
    ...spec,
  })
  const template = Template.fromStack(stack)
  resources.forEach(x => template.hasResource(x, {}))
})

test('stack spawns: blue snapshot, green snapshot', () => {
  const app = new cdk.App()
  const stack = new Service(app, 'test-stack', {
    snapB: 'arn:aws:rds:us-east-1:000000000000:snapshot:b',
    snapG: 'arn:aws:rds:us-east-1:000000000000:snapshot:a',
    ...spec,
  })
  const template = Template.fromStack(stack)
  resources.forEach(x => template.hasResource(x, {}))
})
