import { Stack, Construct, CfnOutput } from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import { IEnvProps } from './shared/IEnvProps'
import { IsProd } from './shared/Environment'

export class UsersStack extends Stack {
  public readonly accessKeyId: CfnOutput
  public readonly secretAccessKey: CfnOutput

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

    const apiIamUser = new iam.User(this, `${props.appName}-${props.envName}-iam-api_user`, {
      userName: `${props.appName}-${props.envName}-api`
    })

    const group = new iam.Group(this, `${props.appName}-restApi`)
    // group.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AdministratorAccess'))
    group.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'))
    group.addUser(apiIamUser)

    const accessKey = new iam.CfnAccessKey(this, `${props.appName}-${props.envName}-iam-api_secret`, {
      userName: apiIamUser.userName,
      status: 'Active'
    })

    // https://github.com/aws/aws-cdk/issues/1612
    this.accessKeyId = new CfnOutput(this, 'accessKeyId', { value: accessKey.ref })
    this.secretAccessKey = new CfnOutput(this, 'secretAccessKey', { value: accessKey.attrSecretAccessKey })
  }
}
