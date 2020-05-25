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
import * as cdk from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import * as rds from '@aws-cdk/aws-rds'
import * as c3 from '@ssh.com/c3'
import * as T from './types'
import * as net from './net'
import * as incident from './incident'

//
export type DbProps = T.Secret & T.Config & T.Network & T.Observable

type DbInstanceProps = T.Secret & T.Network & T.Database

/*

Db supports non-destructive blue/green deployments of database layer from PrivX
- initial deployment (snapshots are not defined) causes creation of blue version of a database
- consequent db recovery targets green version (snapB=default, snapG=...)
- the database rotation process continues with snapshot definitions (snapB=..., snapG=...)

The component continues to run two instances of database unless some is destroyed.
*/
export class Db extends cdk.Construct {
  public readonly host: string

  constructor(scope: cdk.Construct, id: string, props: DbProps) {
    super(scope, id)
    const {
      snapG, snapB,
      subdomain, domain,
    } = props
    this.host = `${subdomain}-rds.${domain}`

    // Initial database deployment
    if ((!snapG && !snapB) || snapB === 'default' || snapG === 'default') {
      const spec = { ...props, name: subdomain, tint: 'b' }
      const db = this.buildDatabase(spec)
      this.cnameDatabase(db, spec)
    }

    // Blue deployment from snapshot
    if (snapB && snapB !== 'default') {
      const spec = { ...props, name: subdomain, tint: 'b', snapshot: snapB }
      const db = this.cloneDatabase(spec)
      this.cnameDatabase(db, spec)
    }

    // Green deployment from snapshot
    if (snapG && snapG !== 'default') {
      const spec = { ...props, name: subdomain, tint: 'g', snapshot: snapG }
      const db = this.cloneDatabase(spec)
      this.cnameDatabase(db, spec)
    }
  }

  buildDatabase({
    kmsKey,
    vpc,
    sg,
    name,
    secret,
  }: DbInstanceProps): rds.DatabaseInstance {
    return new c3.rds.DatabaseInstance(this, 'Dbase', {
      kmsKey,
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: new ec2.InstanceType('t3.small'),
  
      databaseName: name,
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
  
      masterUserPassword: secret.secretValueFromJson('secret'),
      masterUsername: name,
  
      multiAz: false,
      vpc,
      securityGroups: [sg],
  
      backupRetention: cdk.Duration.days(30),
      deleteAutomatedBackups: false,
    })
  }

  cloneDatabase({
    vpc,
    sg,
    tint,
    snapshot,
  }: DbInstanceProps): rds.DatabaseInstance {
    return new rds.DatabaseInstanceFromSnapshot(this, `Dsnap-${tint}`, {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      instanceClass: new ec2.InstanceType('t3.small'),
  
      snapshotIdentifier: snapshot as string,
      generateMasterUserPassword: false,
  
      deletionProtection: false,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
  
      multiAz: false,
      vpc,
      securityGroups: [sg],
  
      backupRetention: cdk.Duration.days(30),
      deleteAutomatedBackups: false,
    })
  }

  cnameDatabase(db: rds.DatabaseInstance, {
    zone,
    tint,
  }: DbInstanceProps) {
    net.CName(this, `Rds${tint}`, {
      recordName:  this.host,
      domainName: db.dbInstanceEndpointAddress,
      ttl: cdk.Duration.seconds(60),
      zone,
      weight: 100,
      identity: `${tint}.${this.host}`,
    })    
  }

  incidents(db: rds.DatabaseInstance, {
    topic
  }: DbProps) {
    const MB = 1024 * 1024
    const GB = 1024 * 1024 * 1024

    incident.fmap(incident.DbOverload(this, db, 60), topic)
    incident.fmap(incident.DbInDebt(this, db, 10), topic)
    incident.fmap(incident.DbOutOfDisk(this, db, 10 * GB), topic)
    incident.fmap(incident.DbOutOfMem(this, db, 50 * MB), topic)
    incident.fmap(incident.DbStorageInDebt(this, db, 25), topic)  
  }
}
