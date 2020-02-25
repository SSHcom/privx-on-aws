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

**Support Native Client**

The default PrivX deployment support only web experience to access target hosts. Usage of native SSH/RDP clients requires exposure of public ip address of PrivX service. Use option `-c public=on` to enable PrivX deployment to public subnet(s).

```bash
## 
cdk deploy privx-on-aws \
  ...
  -c public=on
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
