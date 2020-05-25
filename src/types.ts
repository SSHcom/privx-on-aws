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
import * as sns from '@aws-cdk/aws-sns'
import * as kms from '@aws-cdk/aws-kms'
import * as iam from '@aws-cdk/aws-iam'
import * as vault from '@aws-cdk/aws-secretsmanager'
import * as dns from '@aws-cdk/aws-route53'

//
// Config defines configurable features during the deployment
export interface Config {
  // Unique Name of PrivX deployment
  readonly uniqueName: string

  // Unique class A network CIDR block for VPC
  readonly cidr: string

  // Unique name of your PrivX instance.
  readonly subdomain: string

  // Domain, Hosted Zone must be available in deployment account
  readonly domain: string

  // address to deliver CloudWatch alerts
  readonly email: string

  // RDS Snapshot for blue deployment
  readonly snapB?: string

  // RDS Snapshot for green deployment
  readonly snapG?: string

  // custom TLS certificate
  readonly cert?: string
}


//
// Network specifies backbone infrastructure
export interface Network {
  // AWS VPC
  readonly vpc: ec2.IVpc,

  // Network Security Group
  readonly sg: ec2.ISecurityGroup,

  // Route53 Hosting Zone of application
  readonly zone: dns.IHostedZone
}

//
// Observable defines integration points for service control
export interface Observable {
  // CloudWatch notifications
  readonly topic: sns.ITopic
}

//
// Database defines properties of DB
export interface Database {
  // Unique name of the database
  readonly name: string,

  // color of database stack
  readonly tint: string

  // database snapshot
  readonly snapshot?: string
}

//
// Secret vault(s)
export interface Secret {
  // reference to encryption key
  readonly kmsKey: kms.IAlias

  // database secrets
  readonly secret: vault.Secret
}

export interface AccessPolicy {
  readonly allowKmsCrypto: iam.IManagedPolicy
}

//
// Services defines endpoint for Backing services
export interface Services {
  // database endpoint
  readonly database: string

  // redis endpoint
  readonly redis: string

  // file system endpoint
  readonly filesystem: string
}
