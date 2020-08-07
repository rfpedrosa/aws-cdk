import { Stack, Construct } from '@aws-cdk/core'
import * as elasticbeanstalk from '@aws-cdk/aws-elasticbeanstalk'
import { IComputeStackEnvProps } from './IComputeStackEnvProps'
import { IsProd } from './shared/Environment'

export class ComputeStack extends Stack {
  public readonly app: elasticbeanstalk.CfnApplication

  constructor (scope: Construct, id: string, props: IComputeStackEnvProps) {
    super(scope, id, {
      env: {
        account: props.account,
        region: props.region
      },
      tags: {
        environment: `${props.envName}`
      }
    })

    const appName = props.appName

    if (props && props.app) {
      // if we receive an app, let say, from another stack, we don't need to recreate
      this.app = props.app
    } else {
      this.app = new elasticbeanstalk.CfnApplication(this, `${props.appName}-eb`, {
        applicationName: appName,
        description: `Rest Web Api for ${appName} app`
      })
    }

    // https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/command-options-general.html
    // 'aws-elasticbeanstalk-service-role' && 'aws-elasticbeanstalk-ec2-role' must be manually created.
    // AWS EB automatically create those roles when an app/env is created by AWS Console.
    // I tried to crease those roles by by using '@aws-cdk/aws-iam' but stack still failed to deploy.
    // Why those roles are needed? https://stackoverflow.com/questions/53392302/environment-failed-to-launch-as-it-entered-terminated-state
    const options: elasticbeanstalk.CfnEnvironment.OptionSettingProperty[] = [
      {
        namespace: 'aws:autoscaling:launchconfiguration',
        optionName: 'IamInstanceProfile',
        value: 'aws-elasticbeanstalk-ec2-role'
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'VPCId',
        value: props.vpc.vpcId
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'ELBSubnets',
        value: props.vpc.publicSubnets.map(x => x.subnetId).toString()
      },
      {
        namespace: 'aws:ec2:vpc',
        optionName: 'Subnets',
        value: IsProd(props)
          ? props.vpc.privateSubnets.map(x => x.subnetId).toString()
          : props.vpc.publicSubnets.map(x => x.subnetId).toString()
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'ServiceRole',
        value: 'aws-elasticbeanstalk-service-role'
      },
      {
        namespace: 'aws:elasticbeanstalk:environment',
        optionName: 'LoadBalancerType',
        value: 'application'
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS__Cognito__userPoolId',
        value: props.userPool.userPoolId
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS__Cognito__appClientId',
        value: props.apiClient.userPoolClientId
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS__DefaultRegion',
        value: props.region
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS__AccessKey',
        value: props.accessKeyId.value
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS__SecretKey',
        value: props.secretAccessKey.value
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS__SecretsManager__EFContext_ConnectionStrings_SecretName',
        value: props.rdsSecretArn
      }
    ]

    if (IsProd(props)) {
      options.push({
        namespace: 'aws:elasticbeanstalk:xray',
        optionName: 'XRayEnabled',
        value: 'true'
      })
    } else {
      options.push({
        namespace: 'aws:autoscaling:asg',
        optionName: 'MaxSize',
        value: '1' // do not autoscale in non prod environment
      })
    }

    const env = new elasticbeanstalk.CfnEnvironment(this, `${props.envName}`, {
      environmentName: props.envName,
      applicationName: this.app.applicationName || props.appName,
      solutionStackName: '64bit Amazon Linux 2 v1.0.0 running .NET Core',
      optionSettings: options
    })

    // https://docs.aws.amazon.com/cdk/api/latest/docs/core-readme.html#construct-dependencies
    // to ensure the application is created before the environment
    // env.node.addDependency(iamInstanceProfileRole)
    env.addDependsOn(this.app)
  }
}
