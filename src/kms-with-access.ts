import * as cdk from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import * as kms from '@aws-cdk/aws-kms'

export class AccessibleKmsKey {
  public readonly key: kms.IKey
  public readonly accessPolicy: iam.IManagedPolicy
  public readonly encryptPolicy: iam.IManagedPolicy
  public readonly decryptPolicy: iam.IManagedPolicy

  constructor(scope: cdk.Construct, alias: string) {

    this.key = new kms.Key(scope, 'PrivxKey', {
      alias,
      enableKeyRotation: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      trustAccountIdentities: true,
    })

    this.accessPolicy = new iam.ManagedPolicy(scope, 'KmsKeyFullAccess', {
      managedPolicyName: `allow-crypto-${alias}`,
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:Decrypt",
            "kms:DescribeKey",
            "kms:Encrypt",
            "kms:GenerateDataKey*",
            "kms:ReEncrypt*",
            "kms:CreateGrant",
          ],
          resources: [this.key.keyArn],
        }),
      ]
    })

    this.encryptPolicy = new iam.ManagedPolicy(scope, 'PolicyEncrypt', {
      managedPolicyName: `allow-encrypt-${alias}`,
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:DescribeKey",
            "kms:Encrypt",
            "kms:ReEncrypt*",
          ],
          resources: [this.key.keyArn],
        }),
      ]
    })

    this.decryptPolicy = new iam.ManagedPolicy(scope, 'PolicyDecrypt', {
      managedPolicyName: `allow-decrypt-${alias}`,
      statements: [
        new iam.PolicyStatement({
          actions: [
            "kms:Decrypt",
            "kms:DescribeKey",
          ],
          resources: [this.key.keyArn],
        }),
      ]
    })
  }

  //
  // Allow Access through the AWS Service in the account
  // that are authorized to use the AWS Service
  //   key.grantViaService(`secretsmanager.${cdk.Aws.REGION}.amazonaws.com`)
  //
  public grantViaService(principalName: string): iam.Grant {
    const principal = new iam.ServicePrincipal(principalName)
    const grant = this.key.grant(
      principal,
      'kms:Encrypt',
      'kms:Decrypt',
      'kms:ReEncrypt*',
      'kms:GenerateDataKey*',
      'kms:CreateGrant',
      'kms:DescribeKey',
    )
    // Note: the resource statement is always defined for KMS grant
    const statement = grant.resourceStatement as iam.PolicyStatement
    statement.addCondition('kms:CallerAccount', cdk.Aws.ACCOUNT_ID)
    statement.addCondition('kms:ViaService', principal.service)
    return grant
  }

  //
  // Allow access to the service
  //   key.grantViaService(`logs.${cdk.Aws.REGION}.amazonaws.com`)
  // 
  public grantToService(principalName: string): iam.Grant {
    return this.key.grant(
      new iam.ServicePrincipal(principalName),
      'kms:Encrypt',
      'kms:Decrypt',
      'kms:ReEncrypt*',
      'kms:GenerateDataKey*',
      'kms:DescribeKey',
    )
  }
}
