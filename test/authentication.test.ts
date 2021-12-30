import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import { App } from 'aws-cdk-lib';
import { AuthenticationStack } from '../lib/authentication-stack'
import { StorageStack } from '../lib/storage-stack'

test('User pool created as case insensitive', () => {
  const app = new App({
    context: {
      'xxx:dev:userpool:webclient:domain': 'http://localhost:3000',
      'xxx:dev:userpool:webclient:callbackUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com',
      'xxx:dev:userpool:webclient:logoutUrls': 'http://localhost:3000/login,https://your_friendly_test_subdomain.com/login'
    }
  })

  // WHEN
  const storageStack = new StorageStack(app, 'MyStorageStack', {
    account: 'xxx',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'Blu Sky Link'
  })

  const stack = new AuthenticationStack(app, 'MyTestStack', {
    account: 'xxx',
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
