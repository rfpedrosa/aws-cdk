import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import { App } from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack'

test('User pool created as case insensitive', () => {
  const app = new App()
  // WHEN
  const stack = new NetworkStack(app, 'MyTestStack', {
    account: 'xxx',
    region: 'us-east-1',
    envName: 'prod',
    appName: 'my-app',
    fullname: 'My App'
  })

  // THEN
  expectCDK(stack).to(haveResource('AWS::EC2::VPC', {
    CidrBlock: '10.0.0.0/21'
  }))
})
