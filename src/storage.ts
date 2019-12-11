import * as ec2 from '@aws-cdk/aws-ec2'
import * as cache from '@aws-cdk/aws-elasticache'
import * as rds from '@aws-cdk/aws-rds'
import * as vault from '@aws-cdk/aws-secretsmanager'
import * as cdk from '@aws-cdk/core'

export const Db = (
  scope: cdk.Construct,
  vpc: ec2.IVpc,
  sg: ec2.ISecurityGroup,
  secret: vault.Secret
): rds.DatabaseInstance => {
  const db = new rds.DatabaseInstance(scope, 'Db', {
    databaseName: 'privx',
    deletionProtection: false,
    engine: rds.DatabaseInstanceEngine.POSTGRES,
    instanceClass: new ec2.InstanceType('t3.small'),
    masterUserPassword: secret.secretValueFromJson('secret'),
    masterUsername: 'privx',
    multiAz: false,
    vpc
  })
  db.connections.allowFrom(sg,
    new ec2.Port({
      fromPort: db.instanceEndpoint.port,
      protocol: ec2.Protocol.TCP,
      stringRepresentation: `RDS:${db.instanceEndpoint.port}`,
      toPort: db.instanceEndpoint.port,
    })
  )
  return db
}

export const Redis = (
  scope: cdk.Construct,
  vpc: ec2.IVpc,
  sg: ec2.ISecurityGroup,
): cache.CfnCacheCluster => {
  const subnets = new cache.CfnSubnetGroup(scope, 'RedisNets', {
    description: 'PrivX Private Subnets',
    subnetIds: vpc.privateSubnets.map(x => x.subnetId)
  })

  return new cache.CfnCacheCluster(scope, 'Redis', {
    cacheNodeType: 'cache.t3.small',
    cacheSubnetGroupName: subnets.ref,
    engine: 'redis',
    numCacheNodes: 1,
    vpcSecurityGroupIds: [sg.securityGroupId]
  })
}
