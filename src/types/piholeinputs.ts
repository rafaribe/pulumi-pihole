import { StorageOptions } from './storageoptions';

export type PiholeInputs = {
  namespace: string;
  loadBalancerIP: string;
  storageOptions: StorageOptions;
  password: string,
  generateYAMLToFolder: string;
};
