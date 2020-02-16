import { StorageOptions } from './storageoptions';
import { DeploymentInputs } from './deployment-inputs';
export type PiholeInputs = {
  namespace: string;
  loadBalancerIP: string;
  storageOptions: StorageOptions;
  password: string;
  deploymentInputs: DeploymentInputs;
  generateYAMLToFolder: boolean;
};
