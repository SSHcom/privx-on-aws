import * as ec2 from '@aws-cdk/aws-ec2'
import * as efs from '@aws-cdk/aws-efs'
import * as cache from '@aws-cdk/aws-elasticache'
import * as rds from '@aws-cdk/aws-rds'
import * as vault from '@aws-cdk/aws-secretsmanager'
import * as cdk from '@aws-cdk/core'

export const Db = (
  scope: cdk.Construct,
  databaseName: string,
  vpc: ec2.IVpc,
  sg: ec2.ISecurityGroup,
  secret: vault.Secret
): rds.DatabaseInstance => {
  const db = new rds.DatabaseInstance(scope, 'Db', {
    databaseName,
    deletionProtection: false,
    engine: rds.DatabaseInstanceEngine.POSTGRES,
    instanceClass: new ec2.InstanceType('t3.small'),
    masterUserPassword: secret.secretValueFromJson('secret'),
    masterUsername: databaseName,
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

  const redis = new cache.CfnCacheCluster(scope, 'Redis', {
    cacheNodeType: 'cache.t3.small',
    cacheSubnetGroupName: subnets.ref,
    engine: 'redis',
    numCacheNodes: 1,
    port: 6379,
    vpcSecurityGroupIds: [sg.securityGroupId]
  })

  sg.connections.allowInternally(
    new ec2.Port({
      fromPort: 6379,
      protocol: ec2.Protocol.TCP,
      stringRepresentation: 'REDIS:6379',
      toPort: 6379,
    })
  )

  return redis
}

export const Efs = (
  scope: cdk.Construct,
  vpc: ec2.IVpc,
  sg: ec2.ISecurityGroup
): efs.CfnFileSystem => {
  const fs = new efs.CfnFileSystem(scope, 'Efs',
    {
      fileSystemTags: [{key: 'Name', value: `${scope.node.path}/efs`}]
    }
  )
  vpc.privateSubnets.forEach(
    (subnet, id) => 
      new efs.CfnMountTarget(scope, `Mount${id}`,
        {
          fileSystemId: fs.ref,
          securityGroups: [sg.securityGroupId],
          subnetId: subnet.subnetId,
        }
      )
  )
  // https://docs.aws.amazon.com/efs/latest/ug/accessing-fs-create-security-groups.html
  sg.connections.allowInternally(
    new ec2.Port({
      fromPort: 2049,
      protocol: ec2.Protocol.TCP,
      stringRepresentation: 'NFS:2049',
      toPort: 2049,
    })
  )

  return fs
}
