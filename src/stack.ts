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
import * as acm from '@aws-cdk/aws-certificatemanager'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as logs from '@aws-cdk/aws-logs'
import * as dns from '@aws-cdk/aws-route53'
import * as cdk from '@aws-cdk/core'
import * as compute from './compute'
import * as incident from './incident'
import * as net from './net'
import * as storage from './storage'
import * as vault from './vault'

//
//
export class Service extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: cdk.StackProps) {
    super(app, id, props)
    const cidr = app.node.tryGetContext('cidr') || '10.0.0.0/16'
    const email = app.node.tryGetContext('email')
    const subdomain = app.node.tryGetContext('subdomain') || 'privx'
    const domain = app.node.tryGetContext('domain')

    const secret = vault.Secret(this)
    const pubsub = incident.Channel(this, email)

    const site = `${subdomain}.${domain}`
    const zone = dns.HostedZone.fromLookup(this, 'HostedZone', { domainName: domain })
    const cert = new acm.DnsValidatedCertificate(this, 'Cert', { domainName: site, hostedZone: zone })

    const vpc = net.Vpc(this, cidr)

    const storageSg = new ec2.SecurityGroup(this, 'StorageSg', { vpc })
    const db = storage.Db(this, subdomain, vpc, storageSg, secret, pubsub)
    const dbHost = { host: db.dbInstanceEndpointAddress, port: db.dbInstanceEndpointPort }

    const redis = storage.Redis(this, vpc, storageSg)
    const redisHost = { host: redis.attrRedisEndpointAddress, port: redis.attrRedisEndpointPort}

    const efs = storage.Efs(this, vpc, storageSg)

    new logs.LogGroup(this, 'Logs', {
      logGroupName: '/privx',
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    })
    const nodes = compute.EC2(this, subdomain, vpc, storageSg, dbHost, redisHost, efs, secret, pubsub)

    const lb = net.Lb(this, vpc)
    const httpsLb = net.PublicHttps(this, vpc, lb, site, zone, cert)
    net.Endpoint(this, vpc, httpsLb, nodes, pubsub)

    const httpLb = net.PublicHttp(this, vpc, lb)
    net.RedirectEndpoint(this, httpLb)
  }
}
