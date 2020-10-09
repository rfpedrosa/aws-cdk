import { Stack, Construct, CfnOutput } from '@aws-cdk/core'
import * as iam from '@aws-cdk/aws-iam'
import { IUsersStackEnvProps } from './IUsersStackEnvProps'
import { IsProd } from './shared/Environment'

export class UsersStack extends Stack {
  public readonly accessKeyId: CfnOutput
  public readonly secretAccessKey: CfnOutput

  constructor (scope: Construct, id: string, props: IUsersStackEnvProps) {
    super(scope, id, {
      env: {
        account: props.account,
        region: props.region
      },
      terminationProtection: props && IsProd(props),
      tags: {
        environment: `${props.envName}`
      }
    })

    const apiIamUser = new iam.User(this, `${props.appName}-${props.envName}-iam-api_user`, {
      userName: `${props.appName}-${props.envName}-api`
    })

    const group = new iam.Group(this, `${props.appName}-${props.envName}-iam-api_group`, {
      groupName: `${props.appName}-${props.envName}-api`
    })
    group.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonCognitoPowerUser'))
    group.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('SecretsManagerReadWrite'))
    group.addUser(apiIamUser)

    props.appBucket.grantReadWrite(group)

    const accessKey = new iam.CfnAccessKey(this, `${props.appName}-${props.envName}-iam-api_secret`, {
      userName: apiIamUser.userName,
      status: 'Active'
    })

    // https://github.com/aws/aws-cdk/issues/1612
    this.accessKeyId = new CfnOutput(this, 'accessKeyId', { value: accessKey.ref })
    this.secretAccessKey = new CfnOutput(this, 'secretAccessKey', { value: accessKey.attrSecretAccessKey })
  }
}
