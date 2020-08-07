# AWS CDK TypeScript project template!

AWS resources provisioned by using [AWS CDK](https://aws.amazon.com/cdk/). AWS CDK is a "[software development framework for defining cloud infrastructure in code and provisioning it through AWS CloudFormation](https://docs.aws.amazon.com/cdk/latest/guide/home.html)" aka Infrastructure as Code (IaC).

This is an [project template for an app with multiple stacks](https://docs.aws.amazon.com/cdk/latest/guide/stack_how_to_create_multiple_stacks.html). It supports:

1. Multi regions and multi aws accounts. [Prod environment may be deployed to a different AWS (sub) account for higher resource isolation](https://aws.amazon.com/blogs/mt/best-practices-for-organizational-units-with-aws-organizations/)
2. With cost optimizations (ex: no NAT Gateways are needed in a test environment as database & applicational layer is public accessible)
3. [Network stack](lib/network-stack.ts) with public (ex: for load balanceds), private (ex: for servers) and isolated (ex: for databases) subnets
4. [Compute stack](lib/compute-stack.ts) based on [AWS EB - 64bit Amazon Linux 2 v1.0.0 running .NET Core platform](https://aws.amazon.com/blogs/developer/aws-elastic-beanstalk-adds-net-core-on-linux-platform/). Suitable to run [Asp.net Core web projects](https://dotnet.microsoft.com/learn/aspnet/what-is-aspnet-core) and easily changeable to support a different AWS EB platform
5. [Database stack](lib/database-stack.ts) AWS RDS Aurora Postgres DB placed in Isolated subnet for production but accessible from application subnet
6. [Authentication stack](lib/authentication-stack.ts) AWS Cognito setup
7. [Users stack](lib/users-stack.ts) for applicational AWS IAM users (programatic access)


The `cdk.json` file tells the CDK Toolkit how to execute your app.

## Useful commands

 * `npm run build`   compile typescript to js
 * `npm run watch`   watch for changes and compile
 * `npm run test`    perform the jest unit tests
 * `cdk deploy`      deploy this stack to your default AWS account/region
 * `cdk diff`        compare deployed stack with current state
 * `cdk synth`       emits the synthesized CloudFormation template