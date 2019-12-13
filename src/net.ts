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
import * as asg from '@aws-cdk/aws-autoscaling'
import * as acm from '@aws-cdk/aws-certificatemanager'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as alb from '@aws-cdk/aws-elasticloadbalancingv2'
import * as dns from '@aws-cdk/aws-route53'
import * as target from '@aws-cdk/aws-route53-targets'
import * as sns from '@aws-cdk/aws-sns'
import * as cdk from '@aws-cdk/core'
import * as incident from './incident'

//
//
export const Vpc = (scope: cdk.Construct, cidr: string): ec2.Vpc => {
  if (!cidr.startsWith('10.') || !cidr.endsWith('/16')) {
    throw new Error('Please use class A network in VPC CIDR = 10.x.x.x/16.')
  }

  return new ec2.Vpc(scope, 'Vpc',
    {
      cidr,
      defaultInstanceTenancy: ec2.DefaultInstanceTenancy.DEFAULT,
      enableDnsHostnames: true,
      enableDnsSupport: true,

      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        publicSubnet(24),
        publicSubnet(19, true),
        privateSubnet(24),
        privateSubnet(19, true),
      ],
    }
  )
}

const publicSubnet = (cidrMask: number, reserved: boolean = false): ec2.SubnetConfiguration => ({
  cidrMask,
  name: 'Public',
  reserved,
  subnetType: ec2.SubnetType.PUBLIC,
})

const privateSubnet = (cidrMask: number, reserved: boolean = false): ec2.SubnetConfiguration => ({
  cidrMask,
  name: 'Private',
  reserved,
  subnetType: ec2.SubnetType.PRIVATE,
})

//
//
export const PublicHttps = (
  scope: cdk.Construct,
  vpc: ec2.IVpc,
  subdomain: string,
  domain: string
): alb.ApplicationListener => {
  const site = `${subdomain}.${domain}`
  const zone = dns.HostedZone.fromLookup(scope, 'HostedZone', { domainName: domain })
  const cert = new acm.DnsValidatedCertificate(scope, 'Cert', { domainName: site, hostedZone: zone })

  const instance = Lb(scope, vpc)
  const listener = instance.addListener(`Https`, {
    certificateArns: [cert.certificateArn],
    defaultTargetGroups: [ None(scope, vpc, 443) ],
    open: true,
    port: 443,
    protocol: alb.ApplicationProtocol.HTTPS,
    sslPolicy: alb.SslPolicy.FORWARD_SECRECY_TLS12_RES,
  })

  new dns.ARecord(scope, 'DNS', {
    recordName: site,
    target: {aliasTarget: new target.LoadBalancerTarget(instance)},
    ttl: cdk.Duration.seconds(60),
    zone,
  })

  return listener
}

const Lb = (scope: cdk.Construct, vpc: ec2.IVpc): alb.ApplicationLoadBalancer =>
  new alb.ApplicationLoadBalancer(scope, 'Lb',
    {
      internetFacing: true,
      vpc,
      vpcSubnets: {onePerAz: false, subnetType: ec2.SubnetType.PUBLIC},
    }
  )

const None = (scope: cdk.Construct, vpc: ec2.IVpc, port: number): alb.ApplicationTargetGroup =>
  new alb.ApplicationTargetGroup(scope, 'None', {
    port,
    targetType: alb.TargetType.INSTANCE,
    vpc,
  })

export const Endpoint = (
  scope: cdk.Construct,
  vpc: ec2.IVpc,
  listener: alb.IApplicationListener,
  service: asg.AutoScalingGroup,
  topic: sns.ITopic,
): alb.ApplicationListenerRule => {
  const endpoint = new alb.ApplicationTargetGroup(scope, 'Ep', {
    healthCheck: {
      healthyHttpCodes: '200',
      interval: cdk.Duration.seconds(10),
      path: '/monitor-service/api/v1/instance/status',
      protocol: alb.Protocol.HTTPS,
      timeout: cdk.Duration.seconds(5),
      unhealthyThresholdCount: 2,
    },
    port: 443,
    stickinessCookieDuration: cdk.Duration.hours(24),
    targetType: alb.TargetType.INSTANCE,
    targets: [service],
    vpc,
  })

  const lb = new alb.ApplicationListenerRule(scope, 'EpHttps', {
    listener,
    pathPattern: '/*',
    priority: Math.floor(Math.random() * 999),
    targetGroups: [endpoint]
  })

  incident.fmap(incident.HighAvailability(scope, endpoint,  1), topic)
  incident.fmap(incident.ServiceAvailability(scope, endpoint, 20), topic)

  return lb
}