import { Construct } from 'constructs';
import { aws_cognito as cognito } from 'aws-cdk-lib';
import { aws_iam as iam } from 'aws-cdk-lib';
import { ICognitoDefaultAuthenticatedRole } from './ICognitoDefaultAuthenticatedRole'

// based on https://serverless-stack.com/chapters/configure-cognito-identity-pool-in-cdk.html
export class CognitoDefaultAuthenticatedRole extends Construct {
  // Public reference to the IAM role
  public readonly role: iam.Role

  constructor (scope: Construct, id: string, props: ICognitoDefaultAuthenticatedRole) {
    super(scope, id)

    // IAM role used for authenticated users
    this.role = new iam.Role(this, `${props.appName}-${props.envName}-CognitoDefaultAuthenticatedRole`, {
      assumedBy: new iam.FederatedPrincipal(
        'cognito-identity.amazonaws.com',
        {
          StringEquals: {
            'cognito-identity.amazonaws.com:aud': props.identityPool.ref
          },
          'ForAnyValue:StringLike': {
            'cognito-identity.amazonaws.com:amr': 'authenticated'
          }
        },
        'sts:AssumeRoleWithWebIdentity'
      )
    })

    this.role.addToPolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        actions: [
          'mobileanalytics:PutEvents',
          'cognito-sync:*',
          'cognito-identity:*'
        ],
        resources: ['*']
      })
    )

    // eslint-disable-next-line no-new
    new cognito.CfnIdentityPoolRoleAttachment(
      this,
      `${props.appName}-${props.envName}-IdentityPoolRoleAttachment`,
      {
        identityPoolId: props.identityPool.ref,
        roles: { authenticated: this.role.roleArn }
      }
    )
  }
}
