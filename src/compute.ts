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
import * as iam from '@aws-cdk/aws-iam'
import * as vault from '@aws-cdk/aws-secretsmanager'
import * as cdk from '@aws-cdk/core'
import * as incident from './incident'
import * as T from './types'

export type ComputeProps = T.Secret & T.AccessPolicy & T.Config & T.Network & T.Observable & T.Services

export const EC2 = (
  scope: cdk.Construct,
  {
    uniqueName,
    subdomain,
    domain,
    vpc, 
    sg,
    database,
    redis,
    filesystem,
    allowKmsCrypto,
    secret,
    topic,
  }: ComputeProps
): asg.AutoScalingGroup => {
  const site = `${subdomain}.${domain}`
  const nodes = new asg.AutoScalingGroup(scope, site, {
    desiredCapacity: 1,
    instanceType: new ec2.InstanceType('t3.small'),
    machineImage: new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    }),
    maxCapacity: 1,
    minCapacity: 0,
    role: Role(scope, secret, site, allowKmsCrypto),
    vpc,
    associatePublicIpAddress: true,
    vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    keyName: scope.node.tryGetContext('sshkey') || '',
    healthCheck: asg.HealthCheck.elb({grace: cdk.Duration.minutes(15)}),
  })
  nodes.addUserData(
    mount(filesystem),
    cloudwatchlogs(site),
    bootstrap(scope, site, uniqueName, database, redis, secret),
  )
  nodes.addSecurityGroup(sg)
  cdk.Tag.add(nodes, 'domain', site)

  incident.fmap(incident.ServiceOverload(scope, nodes, 60), topic)
  incident.fmap(incident.ServiceInDebt(scope, nodes, 10), topic)

  return nodes
}

const Role = (
  scope: cdk.Construct,
  secret: vault.Secret,
  site: string,
  allowKmsCrypto: iam.IManagedPolicy,
): iam.Role => {
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
        `arn:aws:logs:${cdk.Aws.REGION}:${cdk.Aws.ACCOUNT_ID}:log-group:/${site}:*`
      ],
    })
  )

  role.addManagedPolicy(allowKmsCrypto)

  return role
}

const mount = (filesystem: string) => [
  'PATH=$PATH:/usr/local/bin',
  'AZ=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone`',
  `EFS=$AZ.${filesystem}.efs.${cdk.Aws.REGION}.amazonaws.com`,
  `mkdir -p /opt/privx`,
  `mount -t nfs4 $EFS:/ /opt/privx`,
  `echo -e "$EFS:/ \t\t /opt/privx \t nfs \t defaults \t 0 \t 0" | tee -a /etc/fstab`,
].join('\n')

const cloudwatchlogs = (site: string) => [
  'yum install -y awslogs',
  `sed -i \'s/region =.*/region = ${cdk.Aws.REGION}/g\' /etc/awslogs/awscli.conf`,
  `sed -i \'s/log_group_name =.*/log_group_name = \\/${site}/g\' /etc/awslogs/awslogs.conf`,
  'service awslogsd start',
  'systemctl  enable awslogsd',
].join('\n')

const bootstrap = (
  scope: cdk.Construct,
  site: string,
  serviceName: string,
  db: string,
  redis: string,
  secret: vault.Secret,
) => [
  'amazon-linux-extras install epel',
  'yum -y update',
  'yum install -y awscli jq',
  'mkdir -p /opt/privx/nginx',
  'ln -s /opt/privx/nginx /etc/',
  'rm -Rf /etc/machine-id',
  'systemd-machine-id-setup',
  'export VERSION=13.1-97_4a16f5976',
  'yum install -y https://product-repository.ssh.com/x86_64/PrivX/PrivX-${VERSION}.x86_64.rpm',

  'install() {',
  '  export PRIVX_DISABLE_SELINUX=1',
  '  sed -i \'s/data_folder =.*/data_folder="\\/opt\\/privx\\/audit"/g\' /opt/privx/etc/new/shared-config.toml',
  // only required at 11.0
  // '  sed -i \'s/ID/ID_LIKE/g\' /opt/privx/scripts/px-issuer',

  '  export PRIVX_NTP_SERVER=pool.ntp.org',
  `  export AWS_DEFAULT_REGION=${cdk.Aws.REGION}`,
  `  export PRIVX_DNS_NAMES="${site}"`,
  '  export PRIVX_IP_ADDRESSES="127.0.0.1"',

  '  export PRIVX_USE_EXTERNAL_DATABASE=1',
  `  export PRIVX_POSTGRES_ADDRESS=${db}`,
  '  export PRIVX_POSTGRES_PORT=5432',
  `  export PRIVX_POSTGRES_USER=${serviceName}`,
  `  export PRIVX_POSTGRES_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${secret.secretArn} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,

  '  export DB_EXTERNAL_CREATE_PSQL_USER=true',
  `  export PRIVX_DATABASE_NAME=${serviceName}`,
  `  export PRIVX_DATABASE_USERNAME=${serviceName}`,
  `  export PRIVX_DATABASE_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${secret.secretArn} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,
  '  export PRIVX_DATABASE_SSLMODE=require',
  `  export PRIVX_REDIS_ADDRESS=${redis}`,
  '  export PRIVX_REDIS_PORT=6379',
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
  '  if [[ `cat /opt/privx/.configured` == "${VERSION}" ]] ; then',
  '    mv -f /opt/privx/bin/migration-tool /opt/privx/bin/migration-tool_',
  '    touch /opt/privx/bin/migration-tool && chmod a+x /opt/privx/bin/migration-tool',
  '    /opt/privx/scripts/postinstall.sh',
  '    mv -f /opt/privx/bin/migration-tool_ /opt/privx/bin/migration-tool',
  '  else',
  '    /opt/privx/scripts/postinstall.sh',
  '  fi',
  '}',

  'test -f /opt/privx/.configured && config || install',
  'echo ${VERSION} > /opt/privx/.configured',
].join('\n')
