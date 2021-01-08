import { expect as expectCDK, haveResource, beASupersetOfTemplate } from '@aws-cdk/assert'
import * as cdk from '@aws-cdk/core'
import { DatabaseStack } from '../lib/database-stack'
import { NetworkStack } from '../lib/network-stack'

const app = new cdk.App()

const networkStack = new NetworkStack(app, 'MyNetworkStack', {
  account: 'XXX',
  region: 'us-east-1',
  envName: 'prod',
  fullname: 'My App',
  appName: 'my-app'
})

const databaseStack = new DatabaseStack(app, 'MyDbStack', {
  account: 'XXX',
  region: 'us-east-1',
  envName: 'prod',
  appName: 'my-app',
  fullname: 'My App',
  vpc: networkStack.vpc
})

test('RDS db on prod is not public available (isolated subnet)', () => {
  // THEN
  expectCDK(databaseStack).to(haveResource('AWS::RDS::DBInstance', {
    PubliclyAccessible: false
  }))
})

test('RDS db on prod is encrypted (at rest)', () => {
  // THEN
  expectCDK(databaseStack).to(haveResource('AWS::RDS::DBCluster', {
    StorageEncrypted: true
  }))
})

test('RDS db on prod is setup to keep snapshots', () => {
  // THEN
  expectCDK(databaseStack).to(beASupersetOfTemplate({
    DeletionPolicy: 'Snapshot'
  }))
})
