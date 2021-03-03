import { IEnvProps } from './shared/IEnvProps'
import * as s3 from '@aws-cdk/aws-s3'

export interface IAuthenticationStackEnvProps extends IEnvProps {
  appBucket: s3.IBucket
}
