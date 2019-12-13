import * as asg from '@aws-cdk/aws-autoscaling'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as iam from '@aws-cdk/aws-iam'
import * as cdk from '@aws-cdk/core'
import { Services } from './config'

export const EC2 = (
  scope: cdk.Construct,
  services: Services
): asg.AutoScalingGroup => {
  const nodes = new asg.AutoScalingGroup(scope, 'Nodes', {
    // associatePublicIpAddress: true,
    desiredCapacity: 1,
    instanceType: new ec2.InstanceType('t3.small'),
    keyName: 'dmitry.kolesnikov',
    machineImage: new ec2.AmazonLinuxImage({
      generation: ec2.AmazonLinuxGeneration.AMAZON_LINUX_2,
    }),
    maxCapacity: 1,
    minCapacity: 0,
    role: Role(scope, services),
    vpc: services.vpc,
    // TODO: private subnets
    // vpcSubnets: { subnetType: ec2.SubnetType.PUBLIC },
    vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE },
  })
  nodes.addUserData(mount(services), bootstrap(services))
  nodes.addSecurityGroup(services.storageSg)

  return nodes
}

const Role = (scope: cdk.Construct, services: Services): iam.Role => {
  const role = new iam.Role(scope, 'Ec2IAM', {
    assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com')
  })

  role.addToPolicy(
    new iam.PolicyStatement({
      actions: ['secretsmanager:GetSecretValue'],
      resources: [services.vault],
    })
  )

  return role
}

const mount = (services: Services) => [
  'PATH=$PATH:/usr/local/bin',
  'AZ=`curl -s http://169.254.169.254/latest/meta-data/placement/availability-zone`',
  `EFS=$AZ.${services.fs}.efs.${cdk.Aws.REGION}.amazonaws.com`,
  `mkdir /mnt/efs`,
  `mount -t nfs4 $EFS:/ /mnt/efs`,
  `mkdir -p /mnt/efs/${services.id}`,
  `mkdir -p /opt/privx`,
  `mount -t nfs4 $EFS:/${services.id} /opt/privx`,
  `echo -e "$EFS:/${services.id} \t\t /opt/privx \t nfs \t defaults \t 0 \t 0" | tee -a /etc/fstab`,
].join('\n')

const bootstrap = (services: Services) => [
  'amazon-linux-extras install epel',
  'yum -y update',
  'yum install -y awscli jq',
  'mkdir -p /opt/privx/nginx',
  'ln -s /opt/privx/nginx /etc/',
  'rm -Rf /etc/machine-id',
  'systemd-machine-id-setup',
  'yum install -y https://product-repository.ssh.com/x86_64/PrivX/PrivX-10.1-77_a3b1c609d.x86_64.rpm',

  'install() {',
  '  sed -i \'s/data_folder =.*/data_folder="\\/opt\\/privx\\/audit"/g\' /opt/privx/etc/new/shared-config.toml',
  '  sed -i \'s/ID/ID_LIKE/g\' /opt/privx/scripts/px-issuer',

  `  export AWS_DEFAULT_REGION=${cdk.Aws.REGION}`,
  '  export PRIVX_DNS_NAMES="localhost"',
  '  export PRIVX_IP_ADDRESSES="127.0.0.1"',
  '  export PRIVX_USE_EXTERNAL_DATABASE=1',

  `  export PRIVX_POSTGRES_ADDRESS=${services.db.host}`,
  `  export PRIVX_POSTGRES_PORT=${services.db.port}`,
  `  export PRIVX_POSTGRES_USER=${services.id}`,
  `  export PRIVX_POSTGRES_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${services.vault} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,

  '  export DB_EXTERNAL_CREATE_PSQL_USER=true',
  `  export PRIVX_DATABASE_NAME=${services.id}`,
  `  export PRIVX_DATABASE_USERNAME=${services.id}`,
  `  export PRIVX_DATABASE_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${services.vault} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,
  '  export PRIVX_DATABASE_SSLMODE=require',
  `  export PRIVX_REDIS_ADDRESS=${services.redis.host}`,
  `  export PRIVX_REDIS_PORT=${services.redis.port}`,
  '  export PRIVX_KEYVAULT_PKCS11_ENABLE=0',

  '  export PRIVX_SUPERUSER=superuser',
  `  export PRIVX_SUPERUSER_PASSWORD=\`aws secretsmanager get-secret-value --secret-id ${services.vault} --region ${cdk.Aws.REGION} | jq -r '.SecretString | fromjson | .secret'\``,

  '  export PRIVX_DISABLE_SELINUX=1',
  '  /opt/privx/scripts/postinstall.sh',
  '  mv -f /etc/pki/CA/certs/privx-ca.crt /opt/privx/cert/privx-ca.crt',
  '  ln -s /opt/privx/cert/privx-ca.crt /etc/pki/CA/certs/privx-ca.crt',
  '}',

  'config() {',
  '  ln -s /opt/privx/cert/privx-ca.crt /etc/pki/CA/certs/privx-ca.crt',
  '  ln -s /opt/privx/cert/privx-ca.crt /etc/pki/ca-trust/source/anchors/privx-ca-crt',
  '  update-ca-trust extract',
  '  mv -f /opt/privx/bin/migration-tool /opt/privx/bin/migration-tool_',
  '  touch /opt/privx/bin/migration-tool && chmod a+x /opt/privx/bin/migration-tool',
  '  export PRIVX_DISABLE_SELINUX=1',
  '  /opt/privx/scripts/postinstall.sh',
  '  mv -f /opt/privx/bin/migration-tool_ /opt/privx/bin/migration-tool',
  '}',

  'test -f /opt/privx/.configured && config || install',
  'touch /opt/privx/.configured',
].join('\n')
