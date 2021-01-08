import { Construct, Duration, Stack, RemovalPolicy } from '@aws-cdk/core'
import * as rds from '@aws-cdk/aws-rds'
import * as ec2 from '@aws-cdk/aws-ec2'
import { IDatabaseStackEnvProps } from './IDatabaseStackEnvProps'
import { IsProd } from './shared/Environment'

export class DatabaseStack extends Stack {
  readonly rdsScretArn: string | undefined

  constructor (scope: Construct, id: string, props: IDatabaseStackEnvProps) {
    super(scope, id, {
      env: {
        account: props.account,
        region: props.region
      },
      terminationProtection: props && IsProd(props),
      tags: {
        environment: props.envName
      }
    })

    if (IsProd(props)) {
      const rdsDbCluster = new rds.DatabaseCluster(this, `${props.appName}-${props.envName}-DbCluster`, {
        clusterIdentifier: `${props.appName}-${props.envName}-DbCluster`,
        defaultDatabaseName: props.appName,
        engine: rds.DatabaseClusterEngine.auroraPostgres({
          version: rds.AuroraPostgresEngineVersion.VER_11_7 // different version class for each engine type
        }),
        instanceProps: {
          // optional, defaults to t3.medium
          instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
          vpcSubnets: {
            subnetType: IsProd(props) ? ec2.SubnetType.ISOLATED : ec2.SubnetType.PUBLIC
          },
          vpc: props.vpc
        },
        instances: IsProd(props) ? 2 : 1,
        storageEncrypted: IsProd(props),
        backup: {
          retention: IsProd(props) ? Duration.days(7) : Duration.days(1)
        }
        // there is a bug about having this set: https://stackoverflow.com/questions/45117089/deletionpolicysnapshot-cannot-be-specified-for-a-cluster-instance-use-deletion
        // but default value is RemovalPolicy.SNAPSHOT which should be fine
        // removalPolicy: IsProd(props) ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY
      })

      // this.rdsDbCluster.connections.allowDefaultPortInternally()
      // Based on https://ctoasaservice.org/2019/01/23/aws-codebuild-and-access-to-rds/
      rdsDbCluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4('34.228.4.208/28'), 'Allow CODEBUILD on us-east-1')
      rdsDbCluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4('10.0.0.0/21'), 'VPC IP range on network stack (give access to AWS EB)')
      this.rdsScretArn = rdsDbCluster.secret?.secretArn

      // Average CPU utilization over 5 minutes
      const highCpuMetric = rdsDbCluster.metricCPUUtilization()
      highCpuMetric.createAlarm(this, `${props.appName}-${props.envName}-db-HighCpu`, {
        alarmName: `${props.appName}-${props.envName}-db-HighCpu`,
        threshold: 90,
        evaluationPeriods: 1
      })

      // The number of database connections in use (average over 5 minutes)
      const dbConnectionsMetric = rdsDbCluster.metricDatabaseConnections()
      dbConnectionsMetric.createAlarm(this, `${props.appName}-${props.envName}-db-DbConnections`, {
        alarmName: `${props.appName}-${props.envName}-db-DbConnections`,
        threshold: 100,
        evaluationPeriods: 1
      })

      // The average amount of time taken per disk I/O operation (average over 1 minute)
      const readLatency = rdsDbCluster.metric('ReadLatency', { statistic: 'Average', period: Duration.seconds(60) })
      readLatency.createAlarm(this, `${props.appName}-${props.envName}-db-ReadLatency`, {
        alarmName: `${props.appName}-${props.envName}-db-ReadLatency`,
        threshold: 10,
        evaluationPeriods: 1
      })

      // todo refine alarms and add some actions as well: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cloudwatch-readme.html#alarm-actions
    } else {
      const instance = new rds.DatabaseInstance(this, `${props.appName}-${props.envName}-DbInstance`, {
        engine: rds.DatabaseInstanceEngine.postgres({ version: rds.PostgresEngineVersion.VER_11_7 }),
        databaseName: props.appName,
        // optional, defaults to m5.large
        instanceType: ec2.InstanceType.of(ec2.InstanceClass.T2, ec2.InstanceSize.MICRO), // free tier
        vpc: props.vpc,
        vpcSubnets: {
          subnetType: ec2.SubnetType.PUBLIC
        },
        allocatedStorage: 10,
        backupRetention: Duration.days(1),
        removalPolicy: RemovalPolicy.DESTROY,
        storageEncrypted: false // DB Instance class db.t2.micro does not support encryption at rest
      })
      instance.connections.allowDefaultPortFrom(ec2.Peer.ipv4('34.228.4.208/28'), 'Allow CODEBUILD on us-east-1')
      instance.connections.allowDefaultPortFrom(ec2.Peer.ipv4('10.0.0.0/21'), 'VPC IP range on network stack (give access to AWS EB)')
      this.rdsScretArn = instance.secret?.secretArn
    }
  }
}
