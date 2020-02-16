import * as k8s from '@pulumi/kubernetes';
export type DeploymentInputs = {
  replicas: number;
  image: string;
  imageVersion: string;
  imagePullPolicy: string;
  cpuResourceLimit: string;
  memoryResourceLimit: string;
  envVars: k8s.types.input.core.v1.EnvVar[];
};
