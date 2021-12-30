import { IEnvProps } from './shared/IEnvProps'
import { CfnOutput } from 'aws-cdk-lib';
import { aws_elasticbeanstalk as elasticbeanstalk } from 'aws-cdk-lib';
import { aws_ec2 as ec2 } from 'aws-cdk-lib';
import { aws_cognito as cognito } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';

export interface IComputeStackEnvProps extends IEnvProps {
  app?: elasticbeanstalk.CfnApplication
  vpc: ec2.IVpc,
  userPool: cognito.IUserPool,
  apiClient: cognito.IUserPoolClient,
  accessKeyId: CfnOutput,
  secretAccessKey: CfnOutput,
  rdsCredentialsSecretArn?: string,
  appBucket: s3.IBucket
}
