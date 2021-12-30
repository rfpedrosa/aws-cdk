import { Construct } from 'constructs';
import { Stack, RemovalPolicy } from 'aws-cdk-lib';
import { aws_s3 as s3 } from 'aws-cdk-lib';
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

    this.appBucket = new s3.Bucket(this, `${props.appName}-${props.envName}`, {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: IsProd(props) ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: !IsProd(props),
      encryption: s3.BucketEncryption.KMS_MANAGED,
      // https://docs.amplify.aws/lib/storage/getting-started/q/platform/js#amazon-s3-bucket-cors-policy-setup
      cors: [
        {
          allowedHeaders: [
            '*'
          ],
          allowedMethods: [
            s3.HttpMethods.DELETE,
            s3.HttpMethods.GET,
            s3.HttpMethods.HEAD,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT
          ],
          allowedOrigins: [
            '*'
          ],
          exposedHeaders: [
            'x-amz-server-side-encryption',
            'x-amz-request-id',
            'x-amz-id-2',
            'ETag'
          ],
          maxAge: 3000
        }
      ]
    })
  }
}
