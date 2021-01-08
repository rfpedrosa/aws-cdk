import { expect as expectCDK, haveResourceLike, arrayWith, objectLike } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { DatabaseStack } from '../lib/database-stack'
import { NetworkStack } from '../lib/network-stack'
import { UsersStack } from '../lib/users-stack'
import { ComputeStack } from '../lib/compute-stack'
import { StorageStack } from '../lib/storage-stack'
import { AuthenticationStack } from '../lib/authentication-stack'

const app = new cdk.App({
  context: {
    'XXX:prod:userpool:webclient:callbackUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com',
    'XXX:prod:userpool:webclient:logoutUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com/login'
  }
})

const authenticationStack = new AuthenticationStack(app, 'MyAuthenticationStack', {
  account: 'XXX',
  region: 'us-east-1',
  envName: 'prod',
  appName: 'my-app',
  fullname: 'My App'
})

const networkStack = new NetworkStack(app, 'MyNetworkStack', {
  account: 'XXX',
  region: 'us-east-1',
  envName: 'prod',
  appName: 'my-app',
  fullname: 'My App'
})

const storageStack = new StorageStack(app, 'MyStorageStack', {
  account: 'XXX',
  region: 'us-east-1',
  envName: 'prod',
  appName: 'my-app',
  fullname: 'My App'
})

const usersStack = new UsersStack(app, 'MyUserStack', {
  account: 'XXX',
  region: 'us-east-1',
  envName: 'prod',
  appName: 'my-app',
  fullname: 'My App',
  appBucket: storageStack.appBucket
})

const databaseStack = new DatabaseStack(app, 'MyDbStack', {
  account: 'XXX',
  region: 'us-east-1',
  envName: 'prod',
  appName: 'my-app',
  fullname: 'My App',
  vpc: networkStack.vpc
})

test('EB has DB connection string as environment variable', () => {
  const computeStack = new ComputeStack(app, 'MyComputeStack1', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App',
    apiClient: authenticationStack.apiClient,
    userPool: authenticationStack.userPool,
    vpc: networkStack.vpc,
    accessKeyId: usersStack.accessKeyId,
    secretAccessKey: usersStack.secretAccessKey,
    rdsCredentialsSecretArn: databaseStack.rdsScretArn,
    appBucket: storageStack.appBucket
  })

  // THEN
  expectCDK(computeStack).to(haveResourceLike('AWS::ElasticBeanstalk::Environment', {
    EnvironmentName: 'my-app-prod',
    OptionSettings: arrayWith(objectLike({
      Namespace: 'aws:elasticbeanstalk:application:environment',
      OptionName: 'AWS__SecretsManager__EFContext_ConnectionStrings_SecretName'
    }))
  }))
})

test('Production envrionemnt has ASPNETCORE_ENVIRONMENT as Production', () => {
  const computeStack = new ComputeStack(app, 'MyComputeStack2', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App',
    apiClient: authenticationStack.apiClient,
    userPool: authenticationStack.userPool,
    vpc: networkStack.vpc,
    accessKeyId: usersStack.accessKeyId,
    secretAccessKey: usersStack.secretAccessKey,
    rdsCredentialsSecretArn: databaseStack.rdsScretArn,
    appBucket: storageStack.appBucket
  })

  // THEN
  expectCDK(computeStack).to(haveResourceLike('AWS::ElasticBeanstalk::Environment', {
    EnvironmentName: 'my-app-prod',
    OptionSettings: arrayWith(objectLike({
      Namespace: 'aws:elasticbeanstalk:application:environment',
      OptionName: 'ASPNETCORE_ENVIRONMENT',
      Value: 'Production'
    }))
  }))
})

test('Production envrionemnt has ShowPII environment variable as false', () => {
  const computeStack = new ComputeStack(app, 'MyComputeStack3', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App',
    apiClient: authenticationStack.apiClient,
    userPool: authenticationStack.userPool,
    vpc: networkStack.vpc,
    accessKeyId: usersStack.accessKeyId,
    secretAccessKey: usersStack.secretAccessKey,
    rdsCredentialsSecretArn: databaseStack.rdsScretArn,
    appBucket: storageStack.appBucket
  })

  // THEN
  expectCDK(computeStack).to(haveResourceLike('AWS::ElasticBeanstalk::Environment', {
    EnvironmentName: 'my-app-prod',
    OptionSettings: arrayWith(objectLike({
      Namespace: 'aws:elasticbeanstalk:application:environment',
      OptionName: 'ShowPII',
      Value: 'false'
    }))
  }))
})

test('throw error if rds secret is undefined', () => {
  // THEN
  expect(() => {
    // eslint-disable-next-line no-new
    new ComputeStack(app, 'MyComputeStack', {
      account: 'XXX',
      region: 'us-east-1',
      envName: 'prod',
      appName: 'my-app',
      fullname: 'My App',
      apiClient: authenticationStack.apiClient,
      userPool: authenticationStack.userPool,
      vpc: networkStack.vpc,
      accessKeyId: usersStack.accessKeyId,
      secretAccessKey: usersStack.secretAccessKey,
      rdsCredentialsSecretArn: undefined,
      appBucket: storageStack.appBucket
    })
  }).toThrowError()
})

test('throw error if any client callback url ends with slash', () => {
  const app = new cdk.App({
    context: {
      'XXX:prod:userpool:webclient:callbackUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com/',
      'XXX:prod:userpool:webclient:logoutUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com/login'
    }
  })

  const authenticationStack = new AuthenticationStack(app, 'AuthenticationStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App'
  })

  const networkStack = new NetworkStack(app, 'MyNetworkStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App'
  })

  const usersStack = new UsersStack(app, 'MyUserStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App',
    appBucket: storageStack.appBucket
  })

  const databaseStack = new DatabaseStack(app, 'MyDbStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App',
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
      fullname: 'My App',
      apiClient: authenticationStack.apiClient,
      userPool: authenticationStack.userPool,
      vpc: networkStack.vpc,
      accessKeyId: usersStack.accessKeyId,
      secretAccessKey: usersStack.secretAccessKey,
      rdsCredentialsSecretArn: databaseStack.rdsScretArn,
      appBucket: storageStack.appBucket
    })
  }).toThrowError()
})
