# PrivX on AWS

PrivX is lean privileged access management management solution for your On-Prem, AWS, Azure and GCP infrastructure, all in one multi-cloud solution. This project simplifies and automates PrivX deployment by defining entire Infrastructure as a Code.

[![Build Status](https://secure.travis-ci.org/SSHcom/privx-on-aws.svg?branch=master)](http://travis-ci.org/SSHcom/privx-on-aws)
[![Coverage Status](https://coveralls.io/repos/github/SSHcom/privx-on-aws/badge.svg?branch=master)](https://coveralls.io/github/SSHcom/privx-on-aws?branch=master)
[![Git Hub](https://img.shields.io/github/last-commit/SSHcom/privx-on-aws.svg)](http://github.com/SSHcom/privx-on-aws)
[![Community](https://img.shields.io/badge/community-join-blue)](https://join.slack.com/t/privx-community/shared_invite/enQtNjM0NjYzMjU1NzkyLWJkYjNkYjViYTkyMjRjYWU0ZTM0MTQ5ZGIzODc5ZjNkNWU0ZmE5YjQ5ZDVhMmMxMmQyNGRlMGMyZTE0M2Y5NGE)


## Inspiration

Zero Standing Privileges improves established perimeter security. The perimeter security is based on network segmentation that separates trusted employees from untrusted one. It makes an optimistic assumption: everyone inside perimeter is trusted, outsiders are not trusted. However, anyone who breached perimeter becomes a trusted; an legitimate remote worker becomes untrusted with this model.

Just-in-time access management is the challenging subject. **Please learn about it from our [presentation](https://www.youtube.com/watch?v=Atps1AiATVs)**

PrivX improves the process of granting and revoking access, ensures your admins and engineers always have one-click access to the right infrastructure resources, and gives you an audit trail - vital if you are handling sensitive data or working in IT outsourcing.

PrivX is an ultimate replacement for jump hosts and bastions. It adds traceability to shared accounts using shared passwords, and conveniently combines access management for your On-Prem, AWS, Azure and GCP infrastructure, all in one multi-cloud solution.

**[Get PrivX Free](https://info.ssh.com/privx-free-access-management-software)**


## Getting Started

The latest version of Infrastructure as a Code is available at `master` branch of the repository. All development, including new features and bug fixes, take place on the `master` branch using forking and pull requests as described in contribution guidelines.

<!--
A prior experience with monolithic AWS Cloud Formation has shown difficulties on maintainability. If the template spin off entire infrastructure: networking gears, load balancers, compute resources, service, etc then it might lead you to situation when updates are not applicable without a downtime. Therefore, We splits PrivX solution to few independent layers:
* config layer prepares the AWS account and deploys backing services required for operations.
* service layer deploys PrivX
-->

We are using [AWS CDK](https://github.com/aws/aws-cdk) and [TypeScript](https://github.com/microsoft/typescript) to code the infrastructure. Please use AWS CDK command line tools to deploy PrivX to your AWS Account. As the result, the following commands spawns entire infrastructure required to run PrivX in High-Availability mode, including but not limited to AWS VPC, AWS RDS, AWS EFS, AWS EC2, etc. 

```bash
npm install
cdk deploy privx-service \
  -c cidr=10.0.0.0/16
```

As part of the deployment process it is required to define few arguments:
* `cidr` IPv4 CIDR block for the VPC, use class A network. The default value is '10.0.0.0/16'.


## Next Steps

tbd.

## How To Contribute

The project is [Apache 2.0](LICENSE) licensed and accepts contributions via GitHub pull requests:

1. Fork it
2. Create your feature branch (`git checkout -b my-new-feature`)
3. Commit your changes (`git commit -am 'Added some feature'`)
4. Push to the branch (`git push origin my-new-feature`)
5. Create new Pull Request

The development requires TypeScript and AWS CDK

```bash
npm install -g typescript ts-node aws-cdk
```

```bash
git clone https://github.com/SSHcom/privx-on-aws
cd privx-on-aws

npm install
npm run build
npm run test
npm run lint
```

## License

[![See LICENSE](https://img.shields.io/github/license/fogfish/aws-cdk-pure.svg?style=for-the-badge)](LICENSE)
