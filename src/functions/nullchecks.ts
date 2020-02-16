import * as random from '@pulumi/random';
import { DeploymentInputs } from '../types/deployment-inputs';

export function checkDeploymentNulls(inputs: DeploymentInputs): void {
  if (inputs.replicas === 0) inputs.replicas = 1;
  inputs.image = inputs.image ?? 'pihole/pihole:latest';
  inputs.imageVersion = inputs.imageVersion ?? 'latest';
  inputs.cpuResourceLimit = inputs.cpuResourceLimit ?? '200m';
  inputs.memoryResourceLimit = inputs.memoryResourceLimit ?? '256Mi';

  if (inputs.envVars.length === 0) {
    const password = new random.RandomPassword('password', {
      length: 16,
      overrideSpecial: '_%@',
      special: true,
    });
    inputs.envVars = [
      {
        name: 'TZ',
        value: 'Europe/Lisbon',
      },
      {
        name: 'WEBPASSWORD',
        value: password.result,
      },
    ];
  }
}
export function checkNameNull(name: string): string {
  const defaultName = 'pihole';
  if (name === null || name === undefined || name === '') {
    name = defaultName;
  }
  return name;
}
