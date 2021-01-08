import { expect as expectCDK, haveResource, beASupersetOfTemplate } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { StorageStack } from '../lib/storage-stack'

test('App bucket should be private (not public available)', () => {
  const app = new cdk.App()

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App'
  })

  // THEN
  expectCDK(storageStack).to(haveResource('AWS::S3::Bucket', {
    PublicAccessBlockConfiguration: {
      BlockPublicAcls: true,
      BlockPublicPolicy: true,
      IgnorePublicAcls: true,
      RestrictPublicBuckets: true
    }
  }))
})

test('App bucket has aws:kms encryption', () => {
  const app = new cdk.App()

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App'
  })

  // THEN
  expectCDK(storageStack).to(haveResource('AWS::S3::Bucket', {
    BucketEncryption: {
      ServerSideEncryptionConfiguration: [{
        ServerSideEncryptionByDefault: {
          SSEAlgorithm: 'aws:kms'
        }
      }]
    }
  }))
})

test('App bucket for prod has retain policy', () => {
  const app = new cdk.App()

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App'
  })

  // THEN
  expectCDK(storageStack).to(beASupersetOfTemplate({
    DeletionPolicy: 'Retain'
  }))
})
