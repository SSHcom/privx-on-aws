# PrivX Playbook

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
