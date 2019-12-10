# PrivX on AWS

PrivX is Zero Standing Privileges management solution. It adds traceability to shared accounts using shared passwords, and conveniently combines access management for your On-Prem, AWS, Azure and GCP infrastructure, all in one multi-cloud solution. This project automates PrivX provisioning to AWS.

[![Build Status](https://secure.travis-ci.org/SSHcom/privx-on-aws.svg?branch=master)](http://travis-ci.org/SSHcom/privx-on-aws)
[![Coverage Status](https://coveralls.io/repos/github/SSHcom/privx-on-aws/badge.svg?branch=master)](https://coveralls.io/github/SSHcom/privx-on-aws?branch=master)
[![Git Hub](https://img.shields.io/github/last-commit/SSHcom/privx-on-aws.svg)](http://github.com/SSHcom/privx-on-aws)
[![Community](https://img.shields.io/badge/community-join-blue)](https://join.slack.com/t/privx-community/shared_invite/enQtNjM0NjYzMjU1NzkyLWJkYjNkYjViYTkyMjRjYWU0ZTM0MTQ5ZGIzODc5ZjNkNWU0ZmE5YjQ5ZDVhMmMxMmQyNGRlMGMyZTE0M2Y5NGE)


## Inspiration

Zero Standing Privileges improves established perimeter security. The perimeter security is based on network segmentation that separates trusted employees from others. It makes an optimistic assumption: everyone inside is trusted and outsiders are not. However, anyone who breached perimeter becomes a trusted; an legitimate remote worker becomes untrusted with this model. It is a challenging!

**Please learn about it from out [presentation](https://www.youtube.com/watch?v=Atps1AiATVs)**

PrivX improves the process of granting and revoking access, ensures your admins and engineers always have one-click access to the right infrastructure resources, and gives you an audit trail - vital if you are handling sensitive data or working in IT outsourcing.

PrivX is an ultimate replacement for jump hosts and bastions. It adds traceability to shared accounts using shared passwords, and conveniently combines access management for your On-Prem, AWS, Azure and GCP infrastructure, all in one multi-cloud solution.

**[Get PrivX Free](https://info.ssh.com/privx-free-access-management-software)**


## Getting Started

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
