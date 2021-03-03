import { IEnvProps } from './shared/IEnvProps'
import * as cognito from '@aws-cdk/aws-cognito'

export interface ICognitoDefaultAuthenticatedRole extends IEnvProps {
  identityPool: cognito.CfnIdentityPool
}
