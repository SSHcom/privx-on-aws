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
import * as ec2 from '@aws-cdk/aws-ec2'
import * as efs from '@aws-cdk/aws-efs'
import * as cdk from '@aws-cdk/core'
import { AccessibleKmsKey } from './kms-with-access'
import * as compute from './compute'
import * as incident from './incident'
import * as net from './net'
import * as storage from './storage'
import * as vault from './vault'
import * as db from './db'
import * as T from './types'


export type ServiceProps = cdk.StackProps & T.Config

//
//
export class Service extends cdk.Stack {
  constructor(app: cdk.App, id: string, props: ServiceProps) {
    super(app, id, props)

    //
    // core
    const requires = new cdk.ConcreteDependable()
    const vpc = net.Vpc(this, props.cidr)
    const sg = net.Sg(this, vpc)
    const zone = dns.HostedZone.fromLookup(this, 'HostedZone', { domainName: props.domain })
    const topic = incident.Channel(this, props.email)

    //
    // encryption
    const keyAlias = `privx-key-${props.subdomain}`
    const key  = new AccessibleKmsKey(this, keyAlias)
    const kmsKey = key.key
    key.grantToService(`logs.${cdk.Aws.REGION}.amazonaws.com`)
    requires.add(kmsKey)

    //
    // secret vault
    const secret = vault.Secret(this, props.subdomain, kmsKey)
    secret.node.addDependency(requires)

    //
    //
    const services = new cdk.ConcreteDependable()
    const lg = new logs.LogGroup(this, 'Logs', {
      encryptionKey: kmsKey,
      logGroupName: `/${props.subdomain}.${props.domain}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      retention: logs.RetentionDays.ONE_MONTH,
    })
    lg.node.addDependency(requires)
    services.add(lg)

    //
    // database
    const dbase = new db.Db(this, 'Db', {
      kmsKey, secret,
      vpc, sg, zone,
      topic,
      ...props
    })
    dbase.node.addDependency(requires)
    services.add(dbase)

    //
    // file system storage
    const fs = new efs.FileSystem(this, 'Efs', {
      vpc,
      securityGroup: sg,
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE},
      encrypted: true,
      kmsKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    fs.node.addDependency(requires)
    services.add(fs)

    //
    // global cache
    const redis = storage.Redis(this, vpc, sg)
    services.add(redis)

    //
    // compute
    const tlsCertificate = app.node.tryGetContext('cert') ||
      (new acm.DnsValidatedCertificate(this, 'Cert', { domainName: `*.${props.domain}`, hostedZone: zone })).certificateArn

    const nodes = compute.EC2(this, {
      kmsKey,
      allowKmsCrypto: key.accessPolicy,
      secret,
      vpc, sg, zone,
      topic,
      database: dbase.host,
      redis: redis.attrRedisEndpointAddress,
      filesystem: fs.fileSystemId,
      tlsCertificate,
      ...props
    })
    nodes.node.addDependency(requires)
    nodes.node.addDependency(services)

    const lb = net.Lb(this, vpc)
    const site = `${props.subdomain}.${props.domain}`
    const httpsLb = net.PublicHttps(this, vpc, lb, site, zone, tlsCertificate)
    net.Endpoint(this, vpc, httpsLb, nodes, topic)

    const httpLb = net.PublicHttp(this, vpc, lb)
    net.RedirectEndpoint(this, httpLb)
  }
}
