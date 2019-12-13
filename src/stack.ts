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
import * as cdk from '@aws-cdk/core'
import * as compute from './compute'
import { Services } from './config'
import * as net from './net'
import * as storage from './storage'
import * as vault from './vault'

//
//
export class AwsRegionServices extends cdk.Stack implements Services  {
  public readonly id: string
  public readonly vpc: ec2.IVpc
  public readonly storageSg: ec2.ISecurityGroup
  public readonly db: {host: string, port: string}
  public readonly redis: {host: string, port: string}
  public readonly fs: string
  public readonly vault: string

  constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
    super(scope, id, props)
    this.id = scope.node.tryGetContext('id') || 'privx'
    const cidr = scope.node.tryGetContext('cidr') || '10.0.0.0/16'

    const secret = vault.Secret(this)
    this.vault = secret.secretArn
    
    this.vpc = net.Vpc(this, cidr)
    this.storageSg = new ec2.SecurityGroup(this, 'StorageSg', { vpc: this.vpc })

    const db = storage.Db(this, this.id, this.vpc, this.storageSg, secret)
    this.db = { host: db.dbInstanceEndpointAddress, port: db.dbInstanceEndpointPort }
    
    const redis = storage.Redis(this, this.vpc, this.storageSg)
    this.redis = { host: redis.attrRedisEndpointAddress, port: redis.attrRedisEndpointPort}

    const efs = storage.Efs(this, this.vpc, this.storageSg)
    this.fs = efs.ref
  }
}

//
//
export interface ServiceProps extends cdk.StackProps {
  readonly services: Services
}

export class Service extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: ServiceProps) {
    super(scope, id, props)
    const domain = scope.node.tryGetContext('domain')
    const nodes = compute.EC2(this, props.services)
    const lb = net.PublicHttps(this, props.services.vpc, 'privx', domain)
    net.Endpoint(this, props.services.vpc, lb, nodes)
  }
}
