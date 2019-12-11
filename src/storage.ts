import * as ec2 from '@aws-cdk/aws-ec2'
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