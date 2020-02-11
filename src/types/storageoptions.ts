import { LocalPaths } from './localpaths';

export type StorageOptions = {
  storageClass: string;
  storageNode: string;
  storageSize: string;
  accessModes: string[];
  localVolumePaths: LocalPaths;
  persistentVolumeReclaimPolicy: string;
};
