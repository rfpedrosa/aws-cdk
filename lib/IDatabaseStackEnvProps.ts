import { IEnvProps } from './shared/IEnvProps'
import { aws_ec2 as ec2 } from 'aws-cdk-lib';

export interface IDatabaseStackEnvProps extends IEnvProps {
  vpc: ec2.IVpc
}
