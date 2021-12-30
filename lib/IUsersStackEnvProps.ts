import { IEnvProps } from './shared/IEnvProps'
import { aws_s3 as s3 } from 'aws-cdk-lib';

export interface IUsersStackEnvProps extends IEnvProps {
  appBucket: s3.IBucket
}
