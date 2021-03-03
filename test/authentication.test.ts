import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { AuthenticationStack } from '../lib/authentication-stack'
import { StorageStack } from '../lib/storage-stack'

test('User pool created as case insensitive', () => {
  const app = new cdk.App({
    context: {
      'XXX:dev:userpool:webclient:domain': 'http://localhost:3000',
      'XXX:dev:userpool:webclient:callbackUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com',
      'XXX:dev:userpool:webclient:logoutUrls': 'http://localhost:3000/login,https://your_friendly_test_subdomain.com/login'
    }
  })

  // WHEN
  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'Blu Sky Link'
  })

  const stack = new AuthenticationStack(app, 'MyTestStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'dev',
    appName: 'my-app',
    fullname: 'My App',
    appBucket: storageStack.appBucket
  })

  // THEN
  expectCDK(stack).to(haveResource('AWS::Cognito::UserPool', {
    MfaConfiguration: 'OPTIONAL',
    UsernameConfiguration: {
      CaseSensitive: false
    }
  }))
})
