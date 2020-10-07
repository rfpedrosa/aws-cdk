import { Construct, Duration, Stack, RemovalPolicy} from '@aws-cdk/core'
import * as rds from '@aws-cdk/aws-rds'
import * as ec2 from '@aws-cdk/aws-ec2'
import { IDatabaseStackEnvProps } from './IDatabaseStackEnvProps'
import { IsProd } from './shared/Environment'

export class DatabaseStack extends Stack {
  readonly rdsDbCluster: rds.DatabaseCluster

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

    let instanceType: ec2.InstanceType
    if (IsProd(props)) {
      instanceType = ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE)
    } else {
      instanceType = ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM)
    }

    this.rdsDbCluster = new rds.DatabaseCluster(this, `${props.appName}-${props.envName}-DbCluster`, {
      clusterIdentifier: `${props.appName}-${props.envName}-DbCluster`,
      defaultDatabaseName: props.appName,
      engine: rds.DatabaseClusterEngine.auroraPostgres({
        version: rds.AuroraPostgresEngineVersion.VER_11_7 // different version class for each engine type
      }),
      credentials: {
        username: 'clusteradmin'
      },
      instanceProps: {
        // optional, defaults to t3.medium
        instanceType: instanceType,
        vpcSubnets: {
          subnetType: IsProd(props) ? ec2.SubnetType.ISOLATED : ec2.SubnetType.PUBLIC
        },
        vpc: props.vpc
      },
      instances: IsProd(props) ? 2 : 1,
      storageEncrypted: IsProd(props),
      backup: {
        retention: IsProd(props) ? Duration.days(7) : Duration.days(1)
      },
      removalPolicy: IsProd(props) ? RemovalPolicy.SNAPSHOT : RemovalPolicy.DESTROY
    })

    // this.rdsDbInstance.connections.allowDefaultPortInternally()
    // Based on https://ctoasaservice.org/2019/01/23/aws-codebuild-and-access-to-rds/
    this.rdsDbCluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4('34.228.4.208/28'), 'Allow CODEBUILD on us-east-1')
    this.rdsDbCluster.connections.allowDefaultPortFrom(ec2.Peer.ipv4('10.0.0.0/21'), 'VPC IP range on network stack (give access to AWS EB)')

    // Add alarm for high CPU
    /* const highCpuMetric = this.rdsDbCluster.metricCPUUtilization()
    highCpuMetric.createAlarm(this, `${props.appName}-${props.envName}-db-HighCpu`, {
      alarmName: `${props.appName}-${props.envName}-db-HighCpu`,
      threshold: 90,
      evaluationPeriods: 1
    }) */

    // The number of database connections in use (average over 5 minutes)
    /* const dbConnectionsMetric = this.rdsDbInstance.metricDatabaseConnections()
    dbConnectionsMetric.createAlarm(this, `${props.appName}-${props.envName}-db-DbConnections`, {
      alarmName: `${props.appName}-${props.envName}-db-DbConnections`,
      threshold: 100,
      evaluationPeriods: 1,
    })

    // The average amount of time taken per disk I/O operation (average over 1 minute)
    const readLatencyMetric = this.rdsDbInstance.metric('ReadLatency',
      {
        statistic: 'Average', period: Duration.seconds(60)
      })
    */

    // todo refine alarms and add some actions as well: https://docs.aws.amazon.com/cdk/api/latest/docs/aws-cloudwatch-readme.html#alarm-actions
  }
}
