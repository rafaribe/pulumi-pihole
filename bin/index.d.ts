import * as k8s from '@pulumi/kubernetes';
import * as pulumi from '@pulumi/pulumi';
export declare type LocalPaths = {
    etcLocalPath: string;
    dnsmasqLocalPath: string;
};
export declare type StorageOptions = {
    storageClass: string;
    storageNode: string;
    storageSize: string;
    accessModes: string[];
    localVolumePaths: LocalPaths;
    persistentVolumeReclaimPolicy: string;
};
export declare type PiholeInputs = {
    namespace: string;
    loadBalancerIP: string;
    storageOptions: StorageOptions;
};
export declare class Pihole extends pulumi.ComponentResource {
    readonly etcPersistentVolume: k8s.core.v1.PersistentVolume;
    readonly dnsmasqPersistentVolume: k8s.core.v1.PersistentVolume;
    readonly deployment: k8s.apps.v1.Deployment;
    readonly services: k8s.core.v1.Service[];
    constructor(name: string, args: PiholeInputs);
}
