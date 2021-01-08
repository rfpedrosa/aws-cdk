import { expect as expectCDK, haveResource } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { NetworkStack } from '../lib/network-stack'

test('User pool created as case insensitive', () => {
  const app = new cdk.App()
  // WHEN
  const stack = new NetworkStack(app, 'MyTestStack', {
    account: 'XXX',
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
