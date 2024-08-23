//
//   Copyright 2019-2024 SSH Communications Security Corp., All Rights Reserved
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
import * as path from 'path';
import * as fs from 'fs';

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

const readContext = () => {
  const parentDir = path.resolve(__dirname, '..');
  const cdkJsonPath = path.join(parentDir, 'cdk.json');
    if (fs.existsSync(cdkJsonPath)) {
      const cdkJson = JSON.parse(fs.readFileSync(cdkJsonPath, 'utf-8'));
      return cdkJson.context || {};
  }
  return {}
}

test('stack spawns required resources with custom certificate', () => {
  const context = readContext()
  const app = new cdk.App({ context: context })
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
