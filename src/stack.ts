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
    const snapB = app.node.tryGetContext('snapB')
    const snapG = app.node.tryGetContext('snapG')

    const secret = vault.Secret(this)
    const pubsub = incident.Channel(this, email)

    const site = `${subdomain}.${domain}`
    const dbHost = `${subdomain}-rds.${domain}`
    const zone = dns.HostedZone.fromLookup(this, 'HostedZone', { domainName: domain })

    const cert = app.node.tryGetContext('cert') ||
      (new acm.DnsValidatedCertificate(this, 'Cert', { domainName: site, hostedZone: zone })).certificateArn

    const vpc = net.Vpc(this, cidr)
    const storageSg = storage.Sg(this, vpc)
    const requires = new cdk.ConcreteDependable()

    // TODO: deps
    if ((!snapG && !snapB) || snapB === 'default') {
      const db = storage.Db(this, subdomain, vpc, storageSg, secret, pubsub)
      const cname = net.CName(this, 'RdsB', {
        recordName: dbHost,
        domainName: db.dbInstanceEndpointAddress,
        ttl: cdk.Duration.seconds(60),
        zone,
        weight: 100,
        identity: `b.${dbHost}`,
      })
      requires.add(db)
      requires.add(cname)
    }

    //
    if (snapB && snapB !== 'default') {
      const blue = new cdk.Construct(this, 'Blue')
      const db = storage.DbClone(blue, vpc, storageSg, pubsub, snapB)
      const cname = net.CName(blue, 'RdsB', {
        recordName: dbHost,
        domainName: db.dbInstanceEndpointAddress,
        ttl: cdk.Duration.seconds(60),
        zone,
        weight: 0,
        identity: `b.${dbHost}`,
      })
      requires.add(db)
      requires.add(cname)
    }

    //
    if (snapG) {
      const green = new cdk.Construct(this, 'Green')
      const db = storage.DbClone(green, vpc, storageSg, pubsub, snapG)
      const cname = net.CName(green, 'RdsG', {
        recordName: dbHost,
        domainName: db.dbInstanceEndpointAddress,
        ttl: cdk.Duration.seconds(60),
        zone,
        weight: 0,
        identity: `g.${dbHost}`
      })
      requires.add(db)
      requires.add(cname)
    }

    const redis = storage.Redis(this, vpc, storageSg)
    const redisHost = { host: redis.attrRedisEndpointAddress, port: redis.attrRedisEndpointPort}
    requires.add(redis)

    const efs = storage.Efs(this, vpc, storageSg)
    requires.add(efs)

    new logs.LogGroup(this, 'Logs', {
      logGroupName: `/${site}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    })
    const nodes = compute.EC2(this, site, subdomain, vpc, storageSg, dbHost, redisHost, efs, secret, pubsub)
    nodes.node.addDependency(requires)

    const lb = net.Lb(this, vpc)
    const httpsLb = net.PublicHttps(this, vpc, lb, site, zone, cert)
    net.Endpoint(this, vpc, httpsLb, nodes, pubsub)

    const httpLb = net.PublicHttp(this, vpc, lb)
    net.RedirectEndpoint(this, httpLb)
  }
}
