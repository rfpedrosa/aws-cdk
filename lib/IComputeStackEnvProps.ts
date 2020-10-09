import { IEnvProps } from './shared/IEnvProps'
import { CfnApplication } from '@aws-cdk/aws-elasticbeanstalk'
import { IVpc } from '@aws-cdk/aws-ec2'
import { IBucket } from '@aws-cdk/aws-s3'
import { IUserPool, IUserPoolClient } from '@aws-cdk/aws-cognito'
import { CfnOutput } from '@aws-cdk/core'

export interface IComputeStackEnvProps extends IEnvProps {
  app?: CfnApplication
  vpc: IVpc,
  userPool: IUserPool,
  apiClient: IUserPoolClient,
  accessKeyId: CfnOutput,
  secretAccessKey: CfnOutput,
  rdsCredentialsSecretArn?: string,
  appBucket: IBucket
}
