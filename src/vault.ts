import * as vault from '@aws-cdk/aws-secretsmanager'
import * as cdk from '@aws-cdk/core'

export const Secret = (scope: cdk.Construct): vault.Secret =>
  new vault.Secret(scope, 'KeyVault',
    {
      description: 'PrivX root passwords',
      generateSecretString: {
        generateStringKey: 'secret',
        passwordLength: 24,
        secretStringTemplate: JSON.stringify({ }),
      },
    }
  )
