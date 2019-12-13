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
