import { expect as expectCDK, haveResource, beASupersetOfTemplate } from '@aws-cdk/assert'
import { App } from 'aws-cdk-lib';
import { StorageStack } from '../lib/storage-stack'

test('App bucket should be private (not public available)', () => {
  const app = new App()

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'xxx',
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
  const app = new App()

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'xxx',
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
  const app = new App()

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'xxx',
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
