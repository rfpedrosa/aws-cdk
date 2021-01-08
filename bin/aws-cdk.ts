#!/usr/bin/env node
import * as cdk from '@aws-cdk/core'
import { NetworkStack } from '../lib/network-stack'
import { AuthenticationStack } from '../lib/authentication-stack'
import { IComputeStackEnvProps } from '../lib/IComputeStackEnvProps'
import { ComputeStack } from '../lib/compute-stack'
import { IDatabaseStackEnvProps } from '../lib/IDatabaseStackEnvProps'
import { IUsersStackEnvProps } from '../lib/IUsersStackEnvProps'
import { DatabaseStack } from '../lib/database-stack'
import { StorageStack } from '../lib/storage-stack'
import { IEnvProps } from '../lib/shared/IEnvProps'
import { UsersStack } from '../lib/users-stack'

const app = new cdk.App()

const name = app.node.tryGetContext('app:name')
const fullname = app.node.tryGetContext('app:fullname')

const prodAccountNr: string = app.node.tryGetContext('app:prodAwsAccountNumber')
const stackEnvPropsProd: IEnvProps | undefined = (prodAccountNr && prodAccountNr.length === 12)
  ? {
    account: prodAccountNr,
    region: app.node.tryGetContext('app:prodAwsRegion'),
    envName: 'prod',
    appName: name,
    fullname: fullname
  } : undefined

const stackEnvPropsTest: IEnvProps = {
  account: app.node.tryGetContext('app:nonProdAwsAccountNumber'),
  region: app.node.tryGetContext('app:nonProdAwsRegion'),
  envName: 'test',
  appName: name,
  fullname: fullname
}

const stackEnvPropsDev: IEnvProps = {
  account: app.node.tryGetContext('app:nonProdAwsAccountNumber'),
  region: app.node.tryGetContext('app:nonProdAwsRegion'),
  envName: 'dev',
  appName: name,
  fullname: fullname
}

// Dev
// new ComputeStack(app, `${appName}-ComputeStack-${envDev.envName}`, envDev);
// eslint-disable-next-line no-new
new AuthenticationStack(app, `${stackEnvPropsDev.appName}-AuthenticationStack-${stackEnvPropsDev.envName}`, stackEnvPropsDev)
const storageStackDev = new StorageStack(app, `${stackEnvPropsDev.appName}-StorageStack-${stackEnvPropsDev.envName}`, stackEnvPropsDev)

const usersStackEnvPropsDev: IUsersStackEnvProps = {
  ...stackEnvPropsDev,
  appBucket: storageStackDev.appBucket
}
const usersStackDev = new UsersStack(app, `${stackEnvPropsDev.appName}-UsersStack-${stackEnvPropsDev.envName}`, usersStackEnvPropsDev)
usersStackDev.addDependency(storageStackDev)

// Test
const authenticationStackTest = new AuthenticationStack(app, `${stackEnvPropsTest.appName}-AuthenticationStack-${stackEnvPropsTest.envName}`, stackEnvPropsTest)
const storageStackTest = new StorageStack(app, `${stackEnvPropsTest.appName}-StorageStack-${stackEnvPropsTest.envName}`, stackEnvPropsTest)

const usersStackEnvPropsTest: IUsersStackEnvProps = {
  ...stackEnvPropsTest,
  appBucket: storageStackTest.appBucket
}
const usersStackTest = new UsersStack(app, `${stackEnvPropsTest.appName}-UsersStack-${stackEnvPropsTest.envName}`, usersStackEnvPropsTest)
usersStackTest.addDependency(storageStackTest)

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
  rdsCredentialsSecretArn: databaseStackTest.rdsScretArn,
  appBucket: storageStackTest.appBucket
}
const computeStackTest = new ComputeStack(app, `${computeStackEnvPropsTest.appName}-ComputeStack-${computeStackEnvPropsTest.envName}`, computeStackEnvPropsTest)
computeStackTest.addDependency(networkStackTest)
computeStackTest.addDependency(authenticationStackTest)
computeStackTest.addDependency(usersStackTest)
computeStackTest.addDependency(databaseStackTest)
computeStackTest.addDependency(storageStackTest)

// Prod
if (stackEnvPropsProd) {
  const authenticationStackProd = new AuthenticationStack(app, `${stackEnvPropsProd.appName}-AuthenticationStack-${stackEnvPropsProd.envName}`, stackEnvPropsProd)
  const storageStackProd = new StorageStack(app, `${stackEnvPropsProd.appName}-StorageStack-${stackEnvPropsProd.envName}`, stackEnvPropsProd)

  const usersStackEnvPropsProd: IUsersStackEnvProps = {
    ...stackEnvPropsProd,
    appBucket: storageStackProd.appBucket
  }
  const usersStackProd = new UsersStack(app, `${stackEnvPropsProd.appName}-UsersStack-${stackEnvPropsProd.envName}`, usersStackEnvPropsProd)
  usersStackProd.addDependency(storageStackProd)

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
    rdsCredentialsSecretArn: databaseStackProd.rdsScretArn,
    appBucket: storageStackProd.appBucket
  }
  const computeStackProd = new ComputeStack(app, `${computeStackEnvPropsProd.appName}-ComputeStack-${computeStackEnvPropsProd.envName}`, computeStackEnvPropsProd)
  computeStackProd.addDependency(networkStackProd)
  computeStackProd.addDependency(authenticationStackProd)
  computeStackProd.addDependency(usersStackProd)
  computeStackProd.addDependency(databaseStackProd)
  computeStackProd.addDependency(storageStackProd)
}
