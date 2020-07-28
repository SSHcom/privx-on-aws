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
import * as iam from '@aws-cdk/aws-iam'
import * as cdk from '@aws-cdk/core'
import * as c3 from '@ssh.com/c3'
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
    const key = new c3.kms.SymmetricKey(this, props.subdomain)
    key.grantToService(
      new iam.ServicePrincipal(`logs.${cdk.Aws.REGION}.amazonaws.com`)
    )
    const kmsKey = key.alias
    requires.add(key)

    //
    // secret vault
    const secret = vault.Secret(this, props.subdomain, kmsKey)
    secret.node.addDependency(requires)

    //
    //
    const services = new cdk.ConcreteDependable()
    const lg = new c3.logs.LogGroup(this, 'Logs', {
      kmsKey,
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
    const efs = new c3.efs.FileSystem(this, 'Efs', {
      vpc,
      securityGroup: sg,
      vpcSubnets: {subnetType: ec2.SubnetType.PRIVATE},
      kmsKey,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    })
    efs.node.addDependency(requires)
    services.add(efs)

    //
    // global cache
    const redis = storage.Redis(this, vpc, sg)
    services.add(redis)

    //
    // compute
    const cert = app.node.tryGetContext('cert') ||
      (new acm.DnsValidatedCertificate(this, 'Cert', { domainName: `*.${props.domain}`, hostedZone: zone })).certificateArn

    const nodes = compute.EC2(this, {
      kmsKey, allowKmsCrypto: key.accessPolicy, secret,
      vpc, sg, zone,
      topic,
      database: dbase.host,
      redis: redis.attrRedisEndpointAddress,
      filesystem: efs.fileSystemId,
      ...props
    })
    nodes.node.addDependency(requires)
    nodes.node.addDependency(services)

    const lb = net.Lb(this, vpc)
    const site = `${props.subdomain}.${props.domain}`
    const httpsLb = net.PublicHttps(this, vpc, lb, site, zone, cert)
    net.Endpoint(this, vpc, httpsLb, nodes, topic)

    const httpLb = net.PublicHttp(this, vpc, lb)
    net.RedirectEndpoint(this, httpLb)
  }
}
