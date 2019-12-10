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
import * as vault from './vault'
import * as vpc from './vpc'

//
// PrivX Backing Service 
interface Services {
  readonly vpc: ec2.IVpc
}

//
//
export class AwsRegionServices extends cdk.Stack implements Services  {
  public readonly vpc: ec2.IVpc

  constructor(scope: cdk.App, id: string, props: cdk.StackProps) {
    super(scope, id, props)
    const cidr = scope.node.tryGetContext('cidr') || '10.0.0.0/16'

    vault.Secret(this)
    this.vpc = vpc.Silo(this, cidr)
  }
}

//
//
interface StackProps extends cdk.StackProps {
  readonly services: Services
}

export class Stack extends cdk.Stack {
  constructor(scope: cdk.App, id: string, props: StackProps) {
    super(scope, id, props)
  }
}

const app = new cdk.App()
const services = new AwsRegionServices(app, 'privx-config', {})
new Stack(app, 'privx-service', { services })
app.synth()
