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
import * as cloudwatch from '@aws-cdk/aws-cloudwatch'
import * as action from '@aws-cdk/aws-cloudwatch-actions'
import * as alb from '@aws-cdk/aws-elasticloadbalancingv2'
import * as rds from '@aws-cdk/aws-rds'
import * as sns from '@aws-cdk/aws-sns'
import * as cdk from '@aws-cdk/core'

//
//
export const Channel = (scope: cdk.Construct, email: string): sns.Topic => {
  const topic = new sns.Topic(scope, 'Topic', {})
  new sns.Subscription(scope, 'Sub', {
    endpoint: email,
    protocol: sns.SubscriptionProtocol.EMAIL,
    topic,
  })
  return topic
}

export const fmap = (alarm: cloudwatch.Alarm, topic: sns.ITopic): cloudwatch.Alarm => {
  alarm.addAlarmAction(new action.SnsAction(topic))
  alarm.addOkAction(new action.SnsAction(topic))
  return alarm
}

// ----------------------------------------------------------------------------
//
// Load Balancer
//
// ----------------------------------------------------------------------------

export const HighAvailability = (scope: cdk.Construct, target: alb.ApplicationTargetGroup, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'HighAvailability', {
    actionsEnabled: true,
    alarmDescription: [
      'Number of HealthyHost is lower than safety threshold.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/high-availability.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    datapointsToAlarm: 1,
    evaluationPeriods: 1,
    metric: new cloudwatch.Metric({
      dimensions: {
        LoadBalancer: target.firstLoadBalancerFullName,
        TargetGroup: target.targetGroupFullName,
      },
      metricName: 'HealthyHostCount',
      namespace: 'AWS/ApplicationELB',
      statistic: 'Minimum',
    }),
    period: cdk.Duration.minutes(5),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.BREACHING,
  })

export const ServiceAvailability = (scope: cdk.Construct, target: alb.ApplicationTargetGroup, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'ServiceAvailability', {
    alarmDescription: [
      'Number of Service Unrecoverable Failures is higher than safety threshold.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/service-availability.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 4,
    evaluationPeriods: 4,
    metric: new cloudwatch.Metric({
      dimensions: {
        LoadBalancer: target.firstLoadBalancerFullName,
        TargetGroup: target.targetGroupFullName,
      },
      metricName: 'HTTPCode_Target_5XX_Count',
      namespace: 'AWS/ApplicationELB',
      statistic: 'Sum',
    }),
    period: cdk.Duration.seconds(60),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })

// ----------------------------------------------------------------------------
//
// Auto Scaling Group
//
// ----------------------------------------------------------------------------

//
//
export const ServiceOverload = (scope: cdk.Construct, nodes: asg.AutoScalingGroup, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'ServiceOverload', {
    alarmDescription: [
      'Service CPU utilization is above safety threshold.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/service-overload.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 4,
    evaluationPeriods: 4,
    metric: new cloudwatch.Metric({
      dimensions: { AutoScalingGroupName: nodes.autoScalingGroupName },
      metricName: 'CPUUtilization',
      namespace: 'AWS/EC2',
      statistic: 'p90'
    }),
    period: cdk.Duration.seconds(60),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })

//
//
export const ServiceInDebt = (scope: cdk.Construct, nodes: asg.AutoScalingGroup, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'ServiceInDebt', {
    alarmDescription: [
      'Service is running out of CPU credits.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/service-in-debt.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 2,
    evaluationPeriods: 2,
    metric: new cloudwatch.Metric({
      dimensions: { AutoScalingGroupName: nodes.autoScalingGroupName },
      metricName: 'CPUCreditBalance',
      namespace: 'AWS/EC2',
      statistic: 'Minimum'
    }),
    period: cdk.Duration.minutes(5),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })

// ----------------------------------------------------------------------------
//
// RDS
//
// ----------------------------------------------------------------------------

//
//
export const DbOverload = (scope: cdk.Construct, db: rds.DatabaseInstance, threshold: number): cloudwatch.Alarm => 
  new cloudwatch.Alarm(scope, 'DbOverload', {
    alarmDescription: [
      'Database CPU utilization is above safety threshold.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/db-overload.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 4,
    evaluationPeriods: 4,
    metric: new cloudwatch.Metric({
      dimensions: { DBInstanceIdentifier: db.instanceIdentifier },
      metricName: 'CPUUtilization',
      namespace: 'AWS/RDS',
      statistic: 'p90'
    }),
    period: cdk.Duration.seconds(60),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })

//
//
export const DbInDebt = (scope: cdk.Construct, db: rds.DatabaseInstance, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'DbInDebt', {
    alarmDescription: [
      'Database is running out of CPU credits.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/db-in-debt.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 2,
    evaluationPeriods: 2,
    metric: new cloudwatch.Metric({
      dimensions: { DBInstanceIdentifier: db.instanceIdentifier },
      metricName: 'CPUCreditBalance',
      namespace: 'AWS/RDS',
      statistic: 'Minimum'
    }),
    period: cdk.Duration.minutes(5),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })

//
//
export const DbOutOfMem = (scope: cdk.Construct, db: rds.DatabaseInstance, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'DbOutOfMem', {
    alarmDescription: [
      'Database is running out of free memory.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/db-out-of-mem.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 4,
    evaluationPeriods: 4,
    metric: new cloudwatch.Metric({
      dimensions: { DBInstanceIdentifier: db.instanceIdentifier },
      metricName: 'FreeableMemory',
      namespace: 'AWS/RDS',
      statistic: 'p90'
    }),
    period: cdk.Duration.seconds(60),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })

//
//
export const DbOutOfDisk = (scope: cdk.Construct, db: rds.DatabaseInstance, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'DbOutOfDisk', {
    alarmDescription: [
      'Database is running out of free disk space.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/db-out-of-disk.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 4,
    evaluationPeriods: 4,
    metric: new cloudwatch.Metric({
      dimensions: { DBInstanceIdentifier: db.instanceIdentifier },
      metricName: 'FreeStorageSpace',
      namespace: 'AWS/RDS',
      statistic: 'p90'
    }),
    period: cdk.Duration.seconds(60),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })

//
//
export const DbStorageInDebt = (scope: cdk.Construct, db: rds.DatabaseInstance, threshold: number): cloudwatch.Alarm =>
  new cloudwatch.Alarm(scope, 'DbStorageInDebt', {
    alarmDescription: [
      'Database Storage is running out of IO credits.',
      // TODO: 'https://github.com/SSHcom/privx-on-aws/doc/playbook/db-storage-in-debt.md',
    ].join('\n'),
    comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
    datapointsToAlarm: 2,
    evaluationPeriods: 2,
    metric: new cloudwatch.Metric({
      dimensions: { DBInstanceIdentifier: db.instanceIdentifier },
      metricName: 'BurstBalance',
      namespace: 'AWS/RDS',
      statistic: 'Minimum'
    }),
    period: cdk.Duration.minutes(5),
    threshold,
    treatMissingData: cloudwatch.TreatMissingData.NOT_BREACHING,
  })
