import { prisma } from "@/lib/prisma";
import { provisionCertificate } from "@/lib/infra/acme";
import { setString } from "@/lib/infra/redis";
import { generateTenantDockerfile } from "@/lib/infra/dockerfile";

type DeployInput = {
  siteId: string;
  imageTag: string;
  provider: "docker" | "kubernetes";
  repoUrl?: string;
  customDomain?: string | null;
};

async function deployWithDocker(siteSlug: string, imageTag: string): Promise<string[]> {
  const dockerModule = (await import("dockerode")) as {
    default: new (opts: { socketPath: string }) => {
      getContainer: (name: string) => {
        inspect: () => Promise<unknown>;
        remove: (opts: { force: boolean }) => Promise<unknown>;
      };
      createContainer: (opts: Record<string, unknown>) => Promise<{
        start: () => Promise<unknown>;
      }>;
    };
  };
  const Docker = dockerModule.default;
  const docker = new Docker({ socketPath: process.env.DOCKER_SOCKET_PATH || "/var/run/docker.sock" });
  const containerName = `tenant-${siteSlug}`;
  const logs: string[] = [];

  try {
    const existing = docker.getContainer(containerName);
    await existing.inspect();
    await existing.remove({ force: true });
    logs.push("Removed existing container.");
  } catch {
    logs.push("No existing container.");
  }

  await docker.createContainer({
    name: containerName,
    Image: imageTag,
    Env: [`TENANT_SITE_SLUG=${siteSlug}`],
    ExposedPorts: { "3000/tcp": {} },
    HostConfig: {
      RestartPolicy: { Name: "always" },
      PortBindings: { "3000/tcp": [{ HostPort: "0" }] },
    },
  }).then((c) => c.start());

  logs.push("Docker container started.");
  return logs;
}

async function deployWithKubernetes(siteSlug: string, imageTag: string): Promise<string[]> {
  const logs: string[] = [];
  const k8s = await import("@kubernetes/client-node");
  const kubeConfig = new k8s.KubeConfig();
  if (process.env.KUBECONFIG) {
    kubeConfig.loadFromFile(process.env.KUBECONFIG);
  } else {
    kubeConfig.loadFromDefault();
  }
  const apps = kubeConfig.makeApiClient(k8s.AppsV1Api);
  const namespace = process.env.K8S_NAMESPACE || "default";
  const name = `tenant-${siteSlug}`;

  const deployment = {
    metadata: { name, namespace, labels: { app: name } },
    spec: {
      replicas: 1,
      selector: { matchLabels: { app: name } },
      template: {
        metadata: { labels: { app: name } },
        spec: {
          containers: [
            {
              name,
              image: imageTag,
              env: [{ name: "TENANT_SITE_SLUG", value: siteSlug }],
              ports: [{ containerPort: 3000 }],
            },
          ],
        },
      },
    },
  };

  try {
    await apps.replaceNamespacedDeployment({
      name,
      namespace,
      body: deployment,
    });
    logs.push("Kubernetes deployment replaced.");
  } catch {
    await apps.createNamespacedDeployment({
      namespace,
      body: deployment,
    });
    logs.push("Kubernetes deployment created.");
  }

  return logs;
}

export async function queueAndDeployTenant(input: DeployInput): Promise<{ jobId: string; logs: string[] }> {
  const site = await prisma.tenantSite.findUnique({
    where: { id: input.siteId },
    select: { id: true, slug: true, customDomain: true },
  });
  if (!site) throw new Error("Site not found");

  const job = await prisma.deploymentJob.create({
    data: {
      siteId: input.siteId,
      provider: input.provider,
      imageTag: input.imageTag,
      status: "building",
      logs: [],
      metadata: { repoUrl: input.repoUrl || null },
      startedAt: new Date(),
    },
  });

  const logs: string[] = [];
  const dockerfile = generateTenantDockerfile(site.slug, input.imageTag);
  logs.push("Generated tenant Dockerfile.");
  logs.push(dockerfile);

  try {
    await prisma.deploymentJob.update({
      where: { id: job.id },
      data: { status: "deploying", logs },
    });

    const deployLogs =
      input.provider === "docker"
        ? await deployWithDocker(site.slug, input.imageTag)
        : await deployWithKubernetes(site.slug, input.imageTag);
    logs.push(...deployLogs);

    const domain = input.customDomain || site.customDomain;
    if (domain) {
      const cert = await provisionCertificate(site.id, domain);
      logs.push(`Certificate status: ${cert.status}`);
      if (!cert.ok && cert.message) logs.push(`Certificate message: ${cert.message}`);
      await setString(`edge:domain:${domain.toLowerCase()}`, `${site.id}|${site.slug}`, 3600);
    }

    await prisma.deploymentJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        logs,
        finishedAt: new Date(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Deployment failed";
    logs.push(`Error: ${message}`);
    await prisma.deploymentJob.update({
      where: { id: job.id },
      data: {
        status: "failed",
        logs,
        finishedAt: new Date(),
      },
    });
    throw error;
  }

  return { jobId: job.id, logs };
}

