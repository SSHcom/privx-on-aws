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
import * as ec2 from '@aws-cdk/aws-ec2'
import * as cache from '@aws-cdk/aws-elasticache'
import * as cdk from '@aws-cdk/core'

export const Redis = (
  scope: cdk.Construct,
  vpc: ec2.IVpc,
  sg: ec2.ISecurityGroup,
): cache.CfnCacheCluster => {
  const subnets = new cache.CfnSubnetGroup(scope, 'RedisNets', {
    description: 'PrivX Private Subnets',
    subnetIds: vpc.privateSubnets.map(x => x.subnetId)
  })

  const redis = new cache.CfnCacheCluster(scope, 'Redis', {
    cacheNodeType: 'cache.t3.small',
    cacheSubnetGroupName: subnets.ref,
    engine: 'redis',
    numCacheNodes: 1,
    port: 6379,
    vpcSecurityGroupIds: [sg.securityGroupId]
  })

  return redis
}
