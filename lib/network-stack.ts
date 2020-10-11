// https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html#sharing-vpcs-between-stacks
import { Stack, Construct } from '@aws-cdk/core'
import * as ec2 from '@aws-cdk/aws-ec2'
import { IEnvProps } from './shared/IEnvProps'
import { IsProd } from './shared/Environment'

export class NetworkStack extends Stack {
  public readonly vpc: ec2.IVpc
  public readonly bastion: ec2.BastionHostLinux

  constructor (scope: Construct, id: string, props: IEnvProps) {
    super(scope, id, {
      env: {
        account: props.account,
        region: props.region
      },
      terminationProtection: props && IsProd(props),
      tags: {
        environment: props.envName
      }
    })

    // Based on https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html#advanced-subnet-configuration
    // 'subnetConfiguration' specifies the "subnet groups" to create.
    // Every subnet group will have a subnet for each AZ, so this
    // configuration will create `3 groups × 3 AZs = 9` subnets.
    const subnetConfiguration: ec2.SubnetConfiguration[] = [
      {
        // 'subnetType' controls Internet access, as described above.
        subnetType: ec2.SubnetType.PUBLIC,

        // 'name' is used to name this particular subnet group. You will have to
        // use the name for subnet selection if you have more than one subnet
        // group of the same type.
        name: 'Ingress',

        // 'cidrMask' specifies the IP addresses in the range of of individual
        // subnets in the group. Each of the subnets in this group will contain
        // `2^(32 address bits - 24 subnet bits) - 2 reserved addresses = 254`
        // usable IP addresses.
        //
        // If 'cidrMask' is left out the available address space is evenly
        // divided across the remaining subnet groups.
        cidrMask: 24
      }
    ]

    if (IsProd(props)) {
      // Add SubnetType.PRIVATE and a NAT gateway
      /*
      According to AWS (https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html):
      If you would like to save on the cost of NAT gateways,
      you can use isolated subnets instead of private subnets (as described in Advanced Subnet Configuration).
      If you need private instances to have internet connectivity,
      another option is to reduce the number of NAT gateways created by setting the natGateways property to a lower value (the default is one NAT gateway per availability zone).
      Be aware that this may have availability implications for your application.
      */

      subnetConfiguration.push({
        cidrMask: 26,
        name: 'Application1',
        subnetType: ec2.SubnetType.PRIVATE
      },
      {
        cidrMask: 26,
        name: 'Application2',
        subnetType: ec2.SubnetType.PRIVATE,

        // From: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html#reserving-subnet-ip-space
        // 'reserved' can be used to reserve IP address space. No resources will
        // be created for this subnet, but the IP range will be kept available for
        // future creation of this subnet, or even for future subdivision.
        reserved: true // <---- This subnet group is reserved
      },
      {
        cidrMask: 28,
        name: 'Database',
        subnetType: ec2.SubnetType.ISOLATED
      })
    }

    // const maxAzs = 3
    this.vpc = new ec2.Vpc(this, `${props.appName}-${props.envName}-vpc`, {
      // 'cidr' configures the IP range and size of the entire VPC.
      // The IP space will be divided over the configured subnets.
      cidr: '10.0.0.0/21',

      // 'maxAzs' configures the maximum number of availability zones to use
      // maxAzs: maxAzs,

      subnetConfiguration: subnetConfiguration,

      // Based on: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html#subnet-types
      // "If you would like to save on the cost of NAT gateways, you can use isolated subnets instead of private subnets (as described in Advanced Subnet Configuration).
      // If you need private instances to have internet connectivity, another option is to reduce the number of NAT gateways created by setting the natGateways property to a lower value
      // (the default is one NAT gateway per availability zone). Be aware that this may have availability implications for your application.""
      natGateways: IsProd(props) ? 1 : 0
    })

    // From https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html#bastion-hosts:
    // "If you want to connect from the internet using SSH, you need to place the host into a public subnet. You can then configure allowed source hosts."
    if (IsProd(props)) {
      this.bastion = new ec2.BastionHostLinux(this, `${props.appName}-${props.envName}-BastionHost`, {
        vpc: this.vpc,
        subnetSelection: { subnetType: ec2.SubnetType.PUBLIC }
      })

      this.bastion.allowSshAccessFrom(ec2.Peer.anyIpv4())

      // https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html#bastion-hosts
      // "As there are no SSH public keys deployed on this machine, you need to use EC2 Instance Connect with the command aws ec2-instance-connect send-ssh-public-key to provide your SSH public key."

      // From https://docs.aws.amazon.com/cdk/api/latest/docs/aws-ec2-readme.html#vpc-flow-logs:
      // "VPC Flow Logs is a feature that enables you to capture information about the IP traffic going to and from network interfaces in your VPC.
      // Flow log data can be published to Amazon CloudWatch Logs and Amazon S3"
      this.vpc.addFlowLog(`${props.appName}-${props.envName}-FlowLog`)
    }
  }
}
