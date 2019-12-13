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

export interface Services {
  readonly id: string
  readonly vpc: ec2.IVpc
  readonly storageSg: ec2.ISecurityGroup
  readonly db: {host: string, port: string}
  readonly redis: {host: string, port: string}
  readonly fs: string
  readonly vault: string
}
