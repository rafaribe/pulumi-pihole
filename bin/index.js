"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const k8s = require("@pulumi/kubernetes");
const pulumi = require("@pulumi/pulumi");
class Pihole extends pulumi.ComponentResource {
    constructor(name, args) {
        var _a;
        super('pulumi-pihole:Pihole', name, {});
        this.services = [];
        const config = new pulumi.Config();
        const appLabels = { app: name };
        const piHoleNamespace = new k8s.core.v1.Namespace((_a = args.namespace, (_a !== null && _a !== void 0 ? _a : 'default')));
        const readWriteOnce = ['ReadWriteOnce'];
        this.etcPersistentVolume = new k8s.core.v1.PersistentVolume(name + '-local-etc-volume', {
            metadata: {
                labels: {
                    directory: 'etc',
                },
            },
            spec: {
                capacity: {
                    storage: args.storageOptions.storageSize,
                },
                accessModes: args.storageOptions.accessModes,
                persistentVolumeReclaimPolicy: args.storageOptions.persistentVolumeReclaimPolicy,
                storageClassName: args.storageOptions.storageClass,
                local: {
                    path: args.storageOptions.localVolumePaths.etcLocalPath,
                },
                nodeAffinity: {
                    required: {
                        nodeSelectorTerms: [
                            {
                                matchExpressions: [
                                    {
                                        key: 'kubernetes.io/hostname',
                                        operator: 'In',
                                        values: [args.storageOptions.storageNode],
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        }, { parent: this });
        this.dnsmasqPersistentVolume = new k8s.core.v1.PersistentVolume(name + '-local-dnsmasq-volume', {
            metadata: {
                labels: {
                    directory: 'dsnmasq.d',
                },
            },
            spec: {
                capacity: {
                    storage: args.storageOptions.storageSize,
                },
                accessModes: readWriteOnce,
                persistentVolumeReclaimPolicy: args.storageOptions.persistentVolumeReclaimPolicy,
                storageClassName: args.storageOptions.storageClass,
                local: {
                    path: args.storageOptions.localVolumePaths.dnsmasqLocalPath,
                },
                nodeAffinity: {
                    required: {
                        nodeSelectorTerms: [
                            {
                                matchExpressions: [
                                    {
                                        key: 'kubernetes.io/hostname',
                                        operator: 'In',
                                        values: [args.storageOptions.storageNode],
                                    },
                                ],
                            },
                        ],
                    },
                },
            },
        }, { parent: this });
        const piholeEtcPVC = new k8s.core.v1.PersistentVolumeClaim(name + '-local-etc-claim', {
            metadata: { namespace: piHoleNamespace.metadata.name },
            spec: {
                storageClassName: args.storageOptions.storageClass,
                accessModes: args.storageOptions.accessModes,
                resources: {
                    requests: {
                        storage: args.storageOptions.storageSize,
                    },
                },
                selector: { matchLabels: this.etcPersistentVolume.metadata.labels },
            },
        }, { parent: this });
        const piholeDnsmasqPVC = new k8s.core.v1.PersistentVolumeClaim(name + '-local-dnsmasq-claim', {
            metadata: { namespace: piHoleNamespace.metadata.name },
            spec: {
                storageClassName: args.storageOptions.storageClass,
                accessModes: args.storageOptions.accessModes,
                resources: {
                    requests: {
                        storage: args.storageOptions.storageSize,
                    },
                },
                selector: { matchLabels: this.dnsmasqPersistentVolume.metadata.labels },
            },
        }, { parent: this });
        this.deployment = new k8s.apps.v1.Deployment(name, {
            metadata: {
                namespace: piHoleNamespace.metadata.name,
                name: name,
                labels: appLabels,
            },
            spec: {
                selector: { matchLabels: appLabels },
                replicas: 1,
                template: {
                    metadata: { labels: appLabels },
                    spec: {
                        containers: [
                            {
                                name: name,
                                image: 'pihole/pihole:latest',
                                imagePullPolicy: 'IfNotPresent',
                                resources: {
                                    limits: {
                                        cpu: '200m',
                                        memory: '256Mi',
                                    },
                                },
                                env: [
                                    {
                                        name: 'TZ',
                                        value: 'Europe/Lisbon',
                                    },
                                    {
                                        name: 'WEBPASSWORD',
                                        value: config.getSecret('piholepassword'),
                                    },
                                ],
                                volumeMounts: [
                                    {
                                        name: this.etcPersistentVolume.metadata.name,
                                        mountPath: '/etc/pihole',
                                    },
                                    {
                                        name: this.dnsmasqPersistentVolume.metadata.name,
                                        mountPath: '/etc/dnsmasq.d',
                                    },
                                ],
                            },
                        ],
                        volumes: [
                            {
                                name: this.etcPersistentVolume.metadata.name,
                                persistentVolumeClaim: {
                                    claimName: piholeEtcPVC.metadata.name,
                                },
                            },
                            {
                                name: this.dnsmasqPersistentVolume.metadata.name,
                                persistentVolumeClaim: {
                                    claimName: piholeDnsmasqPVC.metadata.name,
                                },
                            },
                        ],
                    },
                },
            },
        }, { parent: this });
        //We need two services that share the same IP because kubernetes doesn't support UDP and TCP ports in the same service
        const tcpProtocol = 'TCP';
        this.services.push(new k8s.core.v1.Service(name + '-' + tcpProtocol.toLowerCase(), {
            metadata: {
                namespace: piHoleNamespace.metadata.name,
                annotations: {
                    ['metallb.universe.tf/allow-shared-ip']: 'true',
                },
            },
            spec: {
                selector: appLabels,
                ports: [
                    {
                        name: name + '-admin-' + tcpProtocol.toLowerCase(),
                        port: 80,
                        targetPort: 80,
                        protocol: tcpProtocol,
                    },
                    {
                        name: name + '-dns-' + tcpProtocol.toLowerCase(),
                        port: 53,
                        targetPort: 53,
                        protocol: tcpProtocol,
                    },
                ],
                type: 'LoadBalancer',
                loadBalancerIP: args.loadBalancerIP,
            },
        }, { parent: this }));
        const udpProtocol = 'UDP';
        this.services.push(new k8s.core.v1.Service(name + '-' + udpProtocol.toLowerCase(), {
            metadata: {
                namespace: piHoleNamespace.metadata.name,
                annotations: {
                    ['metallb.universe.tf/allow-shared-ip']: 'true',
                },
            },
            spec: {
                selector: appLabels,
                ports: [
                    {
                        name: name + '-admin-' + udpProtocol.toLowerCase(),
                        port: 80,
                        targetPort: 80,
                        protocol: udpProtocol,
                    },
                    {
                        name: name + '-dns-' + udpProtocol.toLowerCase(),
                        port: 53,
                        targetPort: 53,
                        protocol: udpProtocol,
                    },
                ],
                type: 'LoadBalancer',
                loadBalancerIP: args.loadBalancerIP,
            },
        }, { parent: this }));
        this.registerOutputs();
    }
}
exports.Pihole = Pihole;
//# sourceMappingURL=index.js.map