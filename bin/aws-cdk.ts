#!/usr/bin/env node
import { App } from 'aws-cdk-lib';
import { NetworkStack } from '../lib/network-stack'
import { IAuthenticationStackEnvProps } from '../lib/IAuthenticationStackEnvProps'
import { AuthenticationStack } from '../lib/authentication-stack'
import { IComputeStackEnvProps } from '../lib/IComputeStackEnvProps'
import { ComputeStack } from '../lib/compute-stack'
import { IDatabaseStackEnvProps } from '../lib/IDatabaseStackEnvProps'
import { IUsersStackEnvProps } from '../lib/IUsersStackEnvProps'
import { DatabaseStack } from '../lib/database-stack'
import { StorageStack } from '../lib/storage-stack'
import { IEnvProps } from '../lib/shared/IEnvProps'
import { UsersStack } from '../lib/users-stack'

const app = new App()

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
    }
  : undefined

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
const storageStackDev = new StorageStack(app, `${stackEnvPropsDev.appName}-StorageStack-${stackEnvPropsDev.envName}`, stackEnvPropsDev)
const authenticationStackEnvPropsDev: IAuthenticationStackEnvProps = {
  ...stackEnvPropsDev,
  appBucket: storageStackDev.appBucket
}
// eslint-disable-next-line no-new
new AuthenticationStack(app, `${authenticationStackEnvPropsDev.appName}-AuthenticationStack-${authenticationStackEnvPropsDev.envName}`, authenticationStackEnvPropsDev)

const usersStackEnvPropsDev: IUsersStackEnvProps = {
  ...stackEnvPropsDev,
  appBucket: storageStackDev.appBucket
}
const usersStackDev = new UsersStack(app, `${usersStackEnvPropsDev.appName}-UsersStack-${usersStackEnvPropsDev.envName}`, usersStackEnvPropsDev)
usersStackDev.addDependency(storageStackDev)

// Test
const storageStackTest = new StorageStack(app, `${stackEnvPropsTest.appName}-StorageStack-${stackEnvPropsTest.envName}`, stackEnvPropsTest)
const authenticationStackEnvPropsTest: IAuthenticationStackEnvProps = {
  ...stackEnvPropsTest,
  appBucket: storageStackTest.appBucket
}

const authenticationStackTest = new AuthenticationStack(app, `${authenticationStackEnvPropsTest.appName}-AuthenticationStack-${authenticationStackEnvPropsTest.envName}`, authenticationStackEnvPropsTest)

const usersStackEnvPropsTest: IUsersStackEnvProps = {
  ...stackEnvPropsTest,
  appBucket: storageStackTest.appBucket
}
const usersStackTest = new UsersStack(app, `${usersStackEnvPropsTest.appName}-UsersStack-${usersStackEnvPropsTest.envName}`, usersStackEnvPropsTest)
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
  const storageStackProd = new StorageStack(app, `${stackEnvPropsProd.appName}-StorageStack-${stackEnvPropsProd.envName}`, stackEnvPropsProd)
  const authenticationStackEnvPropsProd: IAuthenticationStackEnvProps = {
    ...stackEnvPropsProd,
    appBucket: storageStackProd.appBucket
  }

  const authenticationStackProd = new AuthenticationStack(app, `${authenticationStackEnvPropsProd.appName}-AuthenticationStack-${authenticationStackEnvPropsProd.envName}`, authenticationStackEnvPropsProd)

  const usersStackEnvPropsProd: IUsersStackEnvProps = {
    ...stackEnvPropsProd,
    appBucket: storageStackProd.appBucket
  }
  const usersStackProd = new UsersStack(app, `${usersStackEnvPropsProd.appName}-UsersStack-${usersStackEnvPropsProd.envName}`, usersStackEnvPropsProd)
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
