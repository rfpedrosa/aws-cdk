import { IEnvProps } from './shared/IEnvProps'
import { aws_cognito as cognito } from 'aws-cdk-lib';

export interface ICognitoDefaultAuthenticatedRole extends IEnvProps {
  identityPool: cognito.CfnIdentityPool
}
