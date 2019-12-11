import * as ec2 from '@aws-cdk/aws-ec2'
import * as cdk from '@aws-cdk/core'

export const Silo = (scope: cdk.Construct, cidr: string): ec2.Vpc => {
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
