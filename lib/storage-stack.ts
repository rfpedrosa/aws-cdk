
import { Stack, Construct, RemovalPolicy } from '@aws-cdk/core'
import * as s3 from '@aws-cdk/aws-s3'
import { IEnvProps } from './shared/IEnvProps'
import { IsProd } from './shared/Environment'

export class StorageStack extends Stack {
  public readonly appBucket: s3.IBucket

  constructor (scope: Construct, id: string, props: IEnvProps) {
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

    this.appBucket = new s3.Bucket(this, `${props.appName}-${props.envName}-s3`, {
      // avoid bucket name collision using unique ids:
      // https://docs.aws.amazon.com/cdk/latest/guide/identifiers.html#identifiers_unique_ids
      bucketName: `${props.appName}-${props.envName}-${this.node.addr}`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: IsProd(props) ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      encryption: s3.BucketEncryption.KMS_MANAGED
    })
  }
}
