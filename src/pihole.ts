// Imports
import * as k8s from '@pulumi/kubernetes';
import { PiholeInputs } from './types/piholeinputs';
import { ComponentResource, ComponentResourceOptions, Output } from '@pulumi/pulumi';
import { checkDeploymentNulls, checkNameNull } from './functions/nullchecks';

const defaultName = 'pihole';

export class Pihole extends ComponentResource {
  public readonly piHoleNamespace: k8s.core.v1.Namespace;
  private readonly etcPersistentVolume: k8s.core.v1.PersistentVolume;
  private readonly dnsmasqPersistentVolume: k8s.core.v1.PersistentVolume;
  public readonly deployment: k8s.apps.v1.Deployment;
  public readonly services: k8s.core.v1.Service[] = [];
  public readonly password: Output<string>;

  constructor(name: string, args: PiholeInputs, private opts: ComponentResourceOptions) {
    super('pulumi-pihole:Pihole', name ?? defaultName, {}, opts);

    name = checkNameNull(name);

    const appLabels = { app: name };

    this.piHoleNamespace = new k8s.core.v1.Namespace(args.namespace ?? defaultName);

    const readWriteOnce = ['ReadWriteOnce'];

    this.etcPersistentVolume = new k8s.core.v1.PersistentVolume(
      name + '-local-etc-volume',
      {
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
      },
      { parent: this.piHoleNamespace }
    );

    this.dnsmasqPersistentVolume = new k8s.core.v1.PersistentVolume(
      name + '-local-dnsmasq-volume',
      {
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
      },
      { parent: this.piHoleNamespace }
    );

    const piholeEtcPVC = new k8s.core.v1.PersistentVolumeClaim(
      name + '-local-etc-claim',
      {
        metadata: { namespace: this.piHoleNamespace.metadata.name },
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
      },
      { parent: this.piHoleNamespace }
    );

    const piholeDnsmasqPVC = new k8s.core.v1.PersistentVolumeClaim(
      name + '-local-dnsmasq-claim',
      {
        metadata: { namespace: this.piHoleNamespace.metadata.name },
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
      },
      { parent: this.piHoleNamespace }
    );

    checkDeploymentNulls(args.deploymentInputs);

    this.deployment = new k8s.apps.v1.Deployment(
      name,
      {
        metadata: {
          namespace: this.piHoleNamespace.metadata.name,
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
                  image: args.deploymentInputs.image + ':' + args.deploymentInputs.imageVersion,
                  imagePullPolicy: args.deploymentInputs.imagePullPolicy,
                  resources: {
                    limits: {
                      cpu: args.deploymentInputs.cpuResourceLimit,
                      memory: args.deploymentInputs.memoryResourceLimit,
                    },
                  },
                  env: args.deploymentInputs.envVars,
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
      },
      { parent: this.piHoleNamespace }
    );
    //We need two services that share the same IP because kubernetes doesn't support UDP and TCP ports in the same service
    const tcpProtocol = 'TCP';

    this.services.push(
      new k8s.core.v1.Service(
        name + '-' + tcpProtocol.toLowerCase(),
        {
          metadata: {
            namespace: this.piHoleNamespace.metadata.name,
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
        },
        { parent: this }
      )
    );

    const udpProtocol = 'UDP';

    this.services.push(
      new k8s.core.v1.Service(
        name + '-' + udpProtocol.toLowerCase(),
        {
          metadata: {
            namespace: this.piHoleNamespace.metadata.name,
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
        },
        { parent: this.piHoleNamespace }
      )
    );
    this.password = this.deployment.spec.template.spec.containers[0].env[1].value;

    this.registerOutputs();
  }
}
