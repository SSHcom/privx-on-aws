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
import * as cdk from 'aws-cdk-lib'
import * as stack from './stack'

//
// Global config
const app = new cdk.App()
const spec = {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  }
}
const stackName = app.node.tryGetContext('name') || 'privx-on-aws'
const uniqueName = app.node.tryGetContext('subdomain') || 'privx'
const cidr = app.node.tryGetContext('cidr') || '10.0.0.0/16'
const email = app.node.tryGetContext('email')
const subdomain = app.node.tryGetContext('subdomain') || 'privx'
const domain = app.node.tryGetContext('domain')
const snapB = app.node.tryGetContext('snapB')
const snapG = app.node.tryGetContext('snapG')
const cert = app.node.tryGetContext('cert')

//
// Application stack
new stack.Service(app, stackName, {
  uniqueName, cidr, email, subdomain, domain, snapB, snapG, cert,
  ...spec
})
app.synth()
