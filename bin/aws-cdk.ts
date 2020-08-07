#!/usr/bin/env node
import * as cdk from '@aws-cdk/core'
import { NetworkStack } from '../lib/network-stack'
import { AuthenticationStack } from '../lib/authentication-stack'
import { IComputeStackEnvProps } from '../lib/IComputeStackEnvProps'
import { ComputeStack } from '../lib/compute-stack'
import { IDatabaseStackEnvProps } from '../lib/IDatabaseStackEnvProps'
import { DatabaseStack } from '../lib/database-stack'
import { IEnvProps } from '../lib/shared/IEnvProps'
import { UsersStack } from '../lib/users-stack'

const app = new cdk.App()

const appName = app.node.tryGetContext('appName')
const stackEnvPropsProd: IEnvProps = {
  account: app.node.tryGetContext('prodAwsAccountNumber'),
  region: app.node.tryGetContext('prodAwsRegion'),
  envName: 'prod',
  appName: appName
}

const stackEnvPropsTest: IEnvProps = {
  account: app.node.tryGetContext('nonProdAwsAccountNumber'),
  region: app.node.tryGetContext('nonProdAwsRegion'),
  envName: 'test',
  appName: appName
}

const stackEnvPropsDev: IEnvProps = {
  account: app.node.tryGetContext('nonProdAwsAccountNumber'),
  region: app.node.tryGetContext('nonProdAwsRegion'),
  envName: 'dev',
  appName: appName
}

// Dev
// new ComputeStack(app, `${appName}-ComputeStack-${envDev.envName}`, envDev);
// eslint-disable-next-line no-new
new AuthenticationStack(app, `${stackEnvPropsDev.appName}-AuthenticationStack-${stackEnvPropsDev.envName}`, stackEnvPropsDev)

// Test
const usersStackTest = new UsersStack(app, `${stackEnvPropsTest.appName}-UsersStack-${stackEnvPropsTest.envName}`, stackEnvPropsTest)
const authenticationStackTest = new AuthenticationStack(app, `${stackEnvPropsTest.appName}-AuthenticationStack-${stackEnvPropsTest.envName}`, stackEnvPropsTest)

const networkStackTest = new NetworkStack(app, `${stackEnvPropsTest.appName}-NetworkStack-${stackEnvPropsTest.envName}`, stackEnvPropsTest)

const databaseStackEnvPropsTest: IDatabaseStackEnvProps = {
  ...stackEnvPropsTest,
  vpc: networkStackTest.vpc
}
const databaseStackTest = new DatabaseStack(app, `${databaseStackEnvPropsTest.appName}-DatabaseStack-${databaseStackEnvPropsTest.envName}`, databaseStackEnvPropsTest)
databaseStackTest.addDependency(networkStackTest)

const computeStackEnvPropsTest: IComputeStackEnvProps = {
  ...stackEnvPropsTest,
  vpc: networkStackTest.vpc,
  userPool: authenticationStackTest.userPool,
  apiClient: authenticationStackTest.apiClient,
  accessKeyId: usersStackTest.accessKeyId,
  secretAccessKey: usersStackTest.secretAccessKey,
  rdsSecretArn: databaseStackTest.rdsDbCluster.secret?.secretArn
}
const computeStackTest = new ComputeStack(app, `${computeStackEnvPropsTest.appName}-ComputeStack-${computeStackEnvPropsTest.envName}`, computeStackEnvPropsTest)
computeStackTest.addDependency(networkStackTest)
computeStackTest.addDependency(authenticationStackTest)
computeStackTest.addDependency(usersStackTest)
computeStackTest.addDependency(databaseStackTest)

// Prod
const usersStackProd = new UsersStack(app, `${stackEnvPropsProd.appName}-UsersStack-${stackEnvPropsProd.envName}`, stackEnvPropsProd)
const authenticationStackProd = new AuthenticationStack(app, `${stackEnvPropsProd.appName}-AuthenticationStack-${stackEnvPropsProd.envName}`, stackEnvPropsProd);

const networkStackProd = new NetworkStack(app, `${stackEnvPropsProd.appName}-NetworkStack-${stackEnvPropsProd.envName}`, stackEnvPropsProd)

const databaseStackEnvPropsProd: IDatabaseStackEnvProps = {
  ...stackEnvPropsProd,
  vpc: networkStackProd.vpc
}
const databaseStackProd = new DatabaseStack(app, `${databaseStackEnvPropsProd.appName}-DatabaseStack-${databaseStackEnvPropsProd.envName}`, databaseStackEnvPropsProd)
databaseStackProd.addDependency(networkStackProd)

const computeStackEnvPropsProd: IComputeStackEnvProps = {
  ...stackEnvPropsProd,
  vpc: networkStackProd.vpc,
  userPool: authenticationStackProd.userPool,
  apiClient: authenticationStackProd.apiClient,
  accessKeyId: usersStackProd.accessKeyId,
  secretAccessKey: usersStackProd.secretAccessKey,
  rdsSecretArn: databaseStackProd.rdsDbCluster.secret?.secretArn
}
const computeStackProd = new ComputeStack(app, `${computeStackEnvPropsProd.appName}-ComputeStack-${computeStackEnvPropsProd.envName}`, computeStackEnvPropsProd)
computeStackProd.addDependency(networkStackProd)
computeStackProd.addDependency(authenticationStackProd)
computeStackProd.addDependency(usersStackProd)
computeStackProd.addDependency(databaseStackProd)
