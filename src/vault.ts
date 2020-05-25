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
import * as vault from '@aws-cdk/aws-secretsmanager'
import * as kms from '@aws-cdk/aws-kms'
import * as cdk from '@aws-cdk/core'
import * as c3 from '@ssh.com/c3'

export const Secret = (scope: cdk.Construct, name: string, kmsKey: kms.IAlias): vault.Secret =>
  new c3.secretsmanager.Secret(scope, `${name}`,
    {
      kmsKey,
      description: 'PrivX root passwords',
      generateSecretString: {
        excludeCharacters: '{}[]()#;*&!$/\\@"`,?.',
        excludePunctuation: true,
        generateStringKey: 'secret',
        passwordLength: 32,
        secretStringTemplate: JSON.stringify({ }),
      },
    }
  )
