import { expect as expectCDK, beASupersetOfTemplate } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { DatabaseStack } from '../lib/database-stack'
import { NetworkStack } from '../lib/network-stack'
import { AuthenticationStack } from '../lib/authentication-stack'
import { UsersStack } from '../lib/users-stack'
import { ComputeStack } from '../lib/compute-stack'
import { StorageStack } from '../lib/storage-stack'

test('EB has DB connection string as environment variable', () => {
  const app = new cdk.App({
    context: {
      'XXX:prod:userpool:webclient:callbackUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com',
      'XXX:prod:userpool:webclient:logoutUrls': 'http://localhost:3000/login,https://your_friendly_test_subdomain.com/login'
    }
  })

  const authenticationStack = new AuthenticationStack(app, 'AuthenticationStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app'
  })

  const networkStack = new NetworkStack(app, 'MyNetworkStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app'
  })

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app'
  })

  const usersStack = new UsersStack(app, 'MyUserStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    appBucket: storageStack.appBucket
  })

  const databaseStack = new DatabaseStack(app, 'MyDbStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    vpc: networkStack.vpc
  })

  const computeStack = new ComputeStack(app, 'MyComputeStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    vpc: networkStack.vpc,
    userPool: authenticationStack.userPool,
    apiClient: authenticationStack.apiClient,
    accessKeyId: usersStack.accessKeyId,
    secretAccessKey: usersStack.secretAccessKey,
    rdsSecretArn: databaseStack.rdsDbCluster.secret?.secretArn,
    appBucket: storageStack.appBucket
  })

  // THEN
  expectCDK(computeStack).to(beASupersetOfTemplate({
    Properties: {
      OptionSettings: [{
        Namespace: 'aws:elasticbeanstalk:application:environment',
        OptionName: 'AWS__SecretsManager__EFContext_ConnectionStrings_SecretName'
      }]
    }
  }))
})

test('throw error if any client callback url ends with slash', () => {
  const app = new cdk.App({
    context: {
      'XXX:prod:userpool:webclient:callbackUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com/',
      'XXX:prod:userpool:webclient:logoutUrls': 'http://localhost:3000/login,https://your_friendly_test_subdomain.com/login'
    }
  })

  const authenticationStack = new AuthenticationStack(app, 'AuthenticationStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app'
  })

  const networkStack = new NetworkStack(app, 'MyNetworkStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app'
  })

  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app'
  })

  const usersStack = new UsersStack(app, 'MyUserStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    appBucket: storageStack.appBucket
  })

  const databaseStack = new DatabaseStack(app, 'MyDbStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    vpc: networkStack.vpc
  })

  // THEN
  expect(() => {
    // eslint-disable-next-line no-new
    new ComputeStack(app, 'MyComputeStack', {
      account: 'XXX',
      region: 'us-east-1',
      envName: 'prod',
      appName: 'my-app',
      vpc: networkStack.vpc,
      userPool: authenticationStack.userPool,
      apiClient: authenticationStack.apiClient,
      accessKeyId: usersStack.accessKeyId,
      secretAccessKey: usersStack.secretAccessKey,
      rdsSecretArn: databaseStack.rdsDbCluster.secret?.secretArn,
      appBucket: storageStack.appBucket
    })
  }).toThrowError()
})
