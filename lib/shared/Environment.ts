import { IEnvProps } from './IEnvProps'

export function IsProd (props: IEnvProps): boolean {
  return props.envName === 'prod'
}
