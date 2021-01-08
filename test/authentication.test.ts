import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { AuthenticationStack } from '../lib/authentication-stack'

test('User pool created as case insensitive', () => {
  const app = new cdk.App({
    context: {
      'XXX:dev:userpool:webclient:callbackUrls': 'http://localhost:3000,https://your_friendly_test_subdomain.com',
      'XXX:dev:userpool:webclient:logoutUrls': 'http://localhost:3000/login,https://your_friendly_test_subdomain.com/login'
    }
  })

  // WHEN
  const stack = new AuthenticationStack(app, 'MyTestStack', {
    account: 'XXX',
    region: 'us-east-1',
    envName: 'dev',
    appName: 'my-app',
    fullname: 'My App'
  })

  // THEN
  expectCDK(stack).to(haveResource('AWS::Cognito::UserPool', {
    MfaConfiguration: 'OPTIONAL',
    UsernameConfiguration: {
      CaseSensitive: false
    }
  }))
})
