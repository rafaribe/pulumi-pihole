import { StorageOptions } from './storageoptions';

export type PiholeInputs = {
  namespace: string;
  loadBalancerIP: string;
  storageOptions: StorageOptions;
  generateYAMLToFolder: string;
};
