import { IEnvProps } from './shared/IEnvProps'
import * as ec2 from '@aws-cdk/aws-ec2'

export interface IDatabaseStackEnvProps extends IEnvProps {
  vpc: ec2.IVpc
}
