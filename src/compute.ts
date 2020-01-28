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
import * as ec2 from '@aws-cdk/aws-ec2'
import * as efs from '@aws-cdk/aws-efs'
import * as iam from '@aws-cdk/aws-iam'
import * as vault from '@aws-cdk/aws-secretsmanager'
import * as sns from '@aws-cdk/aws-sns'
import * as cdk from '@aws-cdk/core'
import * as incident from './incident'

export const EC2 = (
  scope: cdk.Construct,
  serviceName: string,
  vpc: ec2.IVpc,
  sg: ec2.ISecurityGroup,
  db: {host: string, port: string},
  redis: {host: string, port: string},
  fs: efs.CfnFileSystem,
  secret: vault.Secret,
  topic: sns.ITopic,
): asg.AutoScalingGroup => {
    const fqdn = `${scope.node.tryGetContext('subdomain')}.${scope.node.tryGetContext('domain')}`
  const nodes = new asg.AutoScalingGroup(scope,  (fqdn || 'nodes'), {
    desiredCapacity: 1,
    instanceType: new ec2.InstanceType('t3.small'),
    machineImage: new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    }),
    maxCapacity: 1,
    minCapacity: 0,
    role: Role(scope, secret),
    vpc,
    associatePublicIpAddress: true,
    vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    keyName: scope.node.tryGetContext('sshkey') || ''
  })
  nodes.addUserData(
    mount(fs),
    cloudwatchlogs(),
    bootstrap(scope, serviceName, db, redis, secret),
  )
  nodes.addSecurityGroup(sg)

  cdk.Tag.add(nodes,'domain', fqdn || 'privx')

  incident.fmap(incident.ServiceOverload(scope, nodes, 60), topic)
  incident.fmap(incident.ServiceInDebt(scope, nodes, 10), topic)

  return nodes
}

const Role = (scope: cdk.Construct, secret: vault.Secret): iam.Role => {
  const role = new iam.Role(scope, 'Ec2IAM', {
    assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
  })

  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [secret.secretArn],
    })
  )

  role.addToPolicy(
    new iam.PolicyStatement({
      actions: [
        'logs:CreateLogStream',
        'logs:DescribeLogStreams',
        'logs:CreateLogGroup',
        'logs:PutLogEvents',
      ],
      resources: [
        `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/privx:*`
      ],
    })
  )

  return role
}

const mount = (fs: efs.CfnFileSystem) => [
  'PATH=$PATH:/usr/local/bin',
  'AZ=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone`',
  `EFS=$AZ.${fs.ref}.efs.${cdk.Aws.REGION}.amazonaws.com`,
  `mkdir -p /opt/privx`,
  `mount -t nfs4 $EFS:/ /opt/privx`,
  `echo -e "$EFS:/ \t\t /opt/privx \t nfs \t defaults \t 0 \t 0" | tee -a /etc/fstab`,
].join('\n')

const cloudwatchlogs = () => [
  'yum install -y awslogs',
  `sed -i \'s/region =.*/region = ${cdk.Aws.REGION}/g\' /etc/awslogs/awscli.conf`,
  `sed -i \'s/log_group_name =.*/log_group_name = \\/privx/g\' /etc/awslogs/awslogs.conf`,
  'service awslogsd start',
  'systemctl  enable awslogsd',
].join('\n')

const bootstrap = (
  scope: cdk.Construct,
  serviceName: string,
  db: {host: string, port: string},
  redis: {host: string, port: string},
  secret: vault.Secret,
) => [
  'amazon-linux-extras install epel',
  'yum -y update',
  'yum install -y awscli jq',
  'mkdir -p /opt/privx/nginx',
  'ln -s /opt/privx/nginx /etc/',
  'rm -Rf /etc/machine-id',
  'systemd-machine-id-setup',
  'yum install -y https://product-repository.ssh.com/x86_64/PrivX/PrivX-11.1-98_897dc9c76.x86_64.rpm',

  'install() {',
  '  export PRIVX_DISABLE_SELINUX=1',
  '  sed -i \'s/data_folder =.*/data_folder="\\/opt\\/privx\\/audit"/g\' /opt/privx/etc/new/shared-config.toml',
  '  sed -i \'s/ID/ID_LIKE/g\' /opt/privx/scripts/px-issuer',

  `  export AWS_DEFAULT_REGION=${cdk.Aws.REGION}`,
  '  export PRIVX_DNS_NAMES="localhost"',
  '  export PRIVX_IP_ADDRESSES="127.0.0.1"',
  '  export PRIVX_USE_EXTERNAL_DATABASE=1',

  `  export PRIVX_POSTGRES_ADDRESS=${db.host}`,
  `  export PRIVX_POSTGRES_PORT=${db.port}`,
  `  export PRIVX_POSTGRES_USER=${serviceName}`,
  `  export PRIVX_POSTGRES_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${secret.secretArn} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,

  '  export DB_EXTERNAL_CREATE_PSQL_USER=true',
  `  export PRIVX_DATABASE_NAME=${serviceName}`,
  `  export PRIVX_DATABASE_USERNAME=${serviceName}`,
  `  export PRIVX_DATABASE_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${secret.secretArn} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,
  '  export PRIVX_DATABASE_SSLMODE=require',
  `  export PRIVX_REDIS_ADDRESS=${redis.host}`,
  `  export PRIVX_REDIS_PORT=${redis.port}`,
  '  export PRIVX_KEYVAULT_PKCS11_ENABLE=0',

  '  export PRIVX_SUPERUSER=superuser',
  `  export PRIVX_SUPERUSER_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${secret.secretArn} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,

  `  sed -i '/privx_instance_name = ""/c\privx_instance_name = "${scope.node.tryGetContext('subdomain')}"' /opt/privx/etc/new/shared-config.toml`,
  '  /opt/privx/scripts/postinstall.sh',
  '}',

  'config() {',
  '  sed -i \'s/ID/ID_LIKE/g\' /opt/privx/scripts/px-issuer',
  '  export PRIVX_DISABLE_SELINUX=1',
  '  cp /opt/privx/etc/privx-ca.crt /etc/pki/tls/certs/',
  '  mv -f /opt/privx/bin/migration-tool /opt/privx/bin/migration-tool_',
  '  touch /opt/privx/bin/migration-tool && chmod a+x /opt/privx/bin/migration-tool',
  '  /opt/privx/scripts/postinstall.sh',
  '  mv -f /opt/privx/bin/migration-tool_ /opt/privx/bin/migration-tool',
  '}',

  'test -f /opt/privx/.configured && config || install',
  'touch /opt/privx/.configured',
].join('\n')
