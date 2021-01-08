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
        environment: props.envName
      }
    })

    if (!props.rdsCredentialsSecretArn) {
      throw new Error('rdsCredentialsSecretArn is required')
    }

    let appName: string
    if (props && props.app) {
      // if we receive an app, let say, from another stack, we don't need to recreate
      this.app = props.app
      appName = this.app.applicationName || props.appName
    } else {
      appName = props.appName
      this.app = new elasticbeanstalk.CfnApplication(this, `${appName}-eb`, {
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
      // https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/environments-cfg-alb.html#environments-cfg-alb-namespaces
      {
        namespace: 'aws:elbv2:listener:443',
        optionName: 'Protocol',
        value: 'HTTPS'
      },
      {
        namespace: 'aws:elbv2:listener:443',
        optionName: 'SSLCertificateArns',
        value: this.node.tryGetContext(`${props.account}:${props.envName}:aws:elbv2:listener:443:SSLCertificateArns`)
      },
      {
        namespace: 'aws:elbv2:listener:443',
        optionName: 'SSLPolicy',
        // https://docs.aws.amazon.com/elasticloadbalancing/latest/application/create-https-listener.html#describe-ssl-policies
        value: 'ELBSecurityPolicy-TLS-1-2-Ext-2018-06'
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'ASPNETCORE_ENVIRONMENT',
        value: IsProd(props)
          ? 'Production'
          : props.envName
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'ShowPII',
        value: String(!IsProd(props))
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
        value: props.rdsCredentialsSecretArn
      },
      {
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: 'AWS__s3__BucketName',
        value: props.appBucket.bucketName
      }
    ]

    const webCallbackUrls = this.node.tryGetContext(`${props.account}:${props.envName}:userpool:webclient:callbackUrls`)
    webCallbackUrls.split(',').forEach((element:string, index:number) => {
      const lastChar = element.substr(-1) // Selects the last character
      if (lastChar === '/') {
        throw new Error('web client callback url must not end in slash otherwise CORS won\'t work')
      }

      options.push({
        namespace: 'aws:elasticbeanstalk:application:environment',
        optionName: `AllowedOrigins__urlFrontend${index}`,
        value: element
      })
    })

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

    const env = new elasticbeanstalk.CfnEnvironment(this, `${appName}-eb-${props.envName}`, {
      environmentName: `${appName}-${props.envName}`,
      applicationName: appName,
      solutionStackName: '64bit Amazon Linux 2 v2.0.3 running .NET Core',
      optionSettings: options
    })

    // https://docs.aws.amazon.com/cdk/api/latest/docs/core-readme.html#construct-dependencies
    // to ensure the application is created before the environment
    // env.node.addDependency(iamInstanceProfileRole)
    env.addDependsOn(this.app)
  }
}
