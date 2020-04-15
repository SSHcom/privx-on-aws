# PrivX Playbook

## Advanced configuration

The advanced configuration enables additional deployment options, which improved the service provisioning for managed AWS account. They should not be used in typical deployment scenarios, they requires deep knowledge of AWS service(s)

**Custom Stack Name**

Option `-c name=...` changes the default stack name `privx-on-aws` to user defined. 

```bash
cdk deploy my-new-name \
  ...
  -c name=my-new-name
```

**Custom AWS Certificate**

Option `-c cert=...` disables automatic provisioning of AWS certificate. The deployment would use the certificated defined by its arn.  

```bash
## 
cdk deploy privx-on-aws \
  ...
  -c cert=arn:aws:acm:us-east-1:000000000000:certificate/12345678-1234-1234-1234-123456789012
```


## Corrupted deployment

The deployment might fail if you do not have access right to manage your AWS account or you have misconfigured deployment parameters. The re-deployment from scratch is the easiest solution to recover. Just uninstall/install PrivX again:

```bash
cdk destroy privx-on-aws \
  -c cidr=10.0.0.0/16 \
  -c subdomain=privx \
  -c domain=example.com \
  -c email=my.email@company.com
```

This process clean-up all created resources from you AWS account automatically expect RDS. You need to login to AWS console > RDS and delete database. 


## AWS Certificate validation timeout

The deployment requires a valid AWS Certificate before it can be used with AWS ALB. This scripts automates the process of certificate provisioning. However, AWS Certificate services guarantees validation within 30 min. Usually, it happens faster but we have observed a substantial delay from the service, which causes failure of the deployment. We do recommend either try deployment later or disable certificate provisioning (see Advanced deployment).  


## Recovery Database

The project supports non destructive upgrade or database recovery. AWS RDS do not support [restore from snapshot](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RestoreFromSnapshot.html) to existing database, it always creates a new instance. This is not useful if you'd like to backup and restore PrivX database because it always requires to shutdown and spawn the stack every time when you need to restore. Instead of this complication and noticeable downtime, PrivX-On-AWS allows to the run the application with two database instances and dynamically switch the traffic between them. Let's consider the following scenario:

```bash
##
## 1. You makes an initial deployment of PrivX.
## It deploys a default blue version of a database.
cdk deploy privx-on-aws ...

##
## 2. Then later, you make a database snapshot using AWS Console.
## The recovery process creates a green version of a database from snapshot.
cdk deploy privx-on-aws \
  -c snapB=default \
  -c snapG=arn:aws:rds:${AWS_REGION}:${CDK_DEFAULT_ACCOUNT}:snapshot:my-snapshot-1

##
## You deployment runs two instances of database
##  * default (blue) created from initial deployment
##  * recovered (green) just created from snapshot
##
## Database instances are accessible using domain name privx-rds.${domain}
## A weighted Route53 CNAME records are created, use weight to switch traffic
## from blue to green and back.
##

##
## 3. Once, you've switched the traffic to green instance, you can dispose blue version
cdk deploy privx-on-aws \
  -c snapG=arn:aws:rds:${AWS_REGION}:${CDK_DEFAULT_ACCOUNT}:snapshot:my-snapshot-1

##
## 4. The database rotation process can be continue from green to blue and so on
cdk deploy privx-on-aws \
  -c snapG=arn:aws:rds:${AWS_REGION}:${CDK_DEFAULT_ACCOUNT}:snapshot:my-snapshot-1 \
  -c snapB=arn:aws:rds:${AWS_REGION}:${CDK_DEFAULT_ACCOUNT}:snapshot:my-snapshot-2

```
