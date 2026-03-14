import http from 'http';
import { assertJobCapacity, clearTrackedJob, getTrackedJob, trackJob } from './job-limits.js';
import { ensureAllowedImage, ensureAllowedMountPaths, normalizeRuntimeLimits } from './job-policy.js';

function dockerApi(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const options = {
      socketPath: '/var/run/docker.sock',
      path,
      method,
      headers: { 'Content-Type': 'application/json' },
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: data ? JSON.parse(data) : {} });
        } catch {
          resolve({ status: res.statusCode, data: { message: data } });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function dockerApiStream(method, path) {
  return new Promise((resolve, reject) => {
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      path,
      method,
    }, resolve);
    req.on('error', reject);
    req.end();
  });
}

async function detectNetwork() {
  const containerName = process.env.JOB_RUNNER_CONTAINER_NAME || 'thepopebot-job-runner';
  try {
    const { status, data } = await dockerApi('GET', `/containers/${encodeURIComponent(containerName)}/json`);
    if (status === 200 && data.NetworkSettings?.Networks) {
      const networks = Object.keys(data.NetworkSettings.Networks);
      if (networks.length > 0) return networks[0];
    }
  } catch {}
  return 'bridge';
}

let hostProjectPath;
async function resolveHostProjectPath() {
  if (hostProjectPath !== undefined) return hostProjectPath;
  hostProjectPath = null;
  const containerName = process.env.JOB_RUNNER_CONTAINER_NAME || 'thepopebot-job-runner';
  try {
    const { status, data } = await dockerApi('GET', `/containers/${encodeURIComponent(containerName)}/json`);
    if (status === 200 && Array.isArray(data.Mounts)) {
      const appMount = data.Mounts.find((mount) => mount.Destination === '/app' && mount.Type === 'bind');
      if (appMount?.Source) {
        hostProjectPath = appMount.Source;
      }
    }
  } catch {}
  return hostProjectPath;
}

async function resolveHostPath(containerPath) {
  const hostRoot = await resolveHostProjectPath();
  if (hostRoot && containerPath.startsWith('/app/')) {
    return hostRoot + containerPath.slice(4);
  }
  if (hostRoot && containerPath === '/app') {
    return hostRoot;
  }
  return containerPath;
}

async function ensureImage(image) {
  const inspectRes = await dockerApi('GET', `/images/${encodeURIComponent(image)}/json`);
  if (inspectRes.status === 200) return;

  const [fromImage, tag] = image.includes(':') ? image.split(':') : [image, 'latest'];
  const pullRes = await dockerApi('POST', `/images/create?fromImage=${encodeURIComponent(fromImage)}&tag=${encodeURIComponent(tag)}`);
  if (pullRes.status !== 200) {
    throw new Error(`Docker pull failed (${pullRes.status}): ${pullRes.data?.message || JSON.stringify(pullRes.data)}`);
  }
}

async function launchContainer({
  containerName,
  image,
  env = [],
  workingDir,
  hostConfig = {},
  jobKind = 'default',
  limits = {},
}) {
  ensureAllowedImage(image);

  const normalizedLimits = normalizeRuntimeLimits(jobKind, limits);
  const network = await detectNetwork();
  const resolvedBinds = await Promise.all((hostConfig.Binds || []).map(async (bind) => {
    const parts = String(bind).split(':');
    if (parts[0].startsWith('/app')) {
      parts[0] = await resolveHostPath(parts[0]);
      return parts.join(':');
    }
    return bind;
  }));

  const hostProjectRoot = await resolveHostProjectPath();
  ensureAllowedMountPaths(resolvedBinds, { hostProjectRoot });
  assertJobCapacity(jobKind);
  await ensureImage(image);

  const createHostConfig = {
    ...hostConfig,
    Binds: resolvedBinds,
    NetworkMode: hostConfig.NetworkMode || network,
    NanoCpus: Math.floor(normalizedLimits.maxCpu * 1_000_000_000),
    Memory: normalizedLimits.maxMemory,
    PidsLimit: normalizedLimits.maxPids,
  };

  const createRes = await dockerApi('POST', `/containers/create?name=${encodeURIComponent(containerName)}`, {
    Image: image,
    Env: env,
    ...(workingDir ? { WorkingDir: workingDir } : {}),
    Labels: {
      'thepopebot.managed': 'true',
      'thepopebot.jobKind': jobKind,
    },
    HostConfig: createHostConfig,
  });

  if (createRes.status !== 201) {
    throw new Error(`Docker create failed (${createRes.status}): ${createRes.data?.message || JSON.stringify(createRes.data)}`);
  }

  const containerId = createRes.data.Id;
  const startRes = await dockerApi('POST', `/containers/${containerId}/start`);
  if (startRes.status !== 204 && startRes.status !== 304) {
    throw new Error(`Docker start failed (${startRes.status}): ${startRes.data?.message || JSON.stringify(startRes.data)}`);
  }

  trackJob(containerName, {
    jobKind,
    maxRuntimeMs: normalizedLimits.maxRuntimeMs,
    onTimeout: async () => {
      await stopContainer(containerName).catch(() => {});
      await removeContainer(containerName).catch(() => {});
    },
  });

  return { containerId, containerName, limits: normalizedLimits };
}

async function inspectContainer(containerName) {
  const { status, data } = await dockerApi('GET', `/containers/${encodeURIComponent(containerName)}/json`);
  if (status === 404) {
    clearTrackedJob(containerName);
    return null;
  }
  if (status === 200) return data;
  throw new Error(`Docker inspect failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

async function startContainer(containerName) {
  const { status, data } = await dockerApi('POST', `/containers/${encodeURIComponent(containerName)}/start`);
  if (status === 204 || status === 304) return;
  throw new Error(`Docker start failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

async function stopContainer(containerName) {
  const { status, data } = await dockerApi('POST', `/containers/${encodeURIComponent(containerName)}/stop`);
  if (status === 204 || status === 304 || status === 404) return;
  throw new Error(`Docker stop failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

async function removeContainer(containerName) {
  clearTrackedJob(containerName);
  const { status, data } = await dockerApi('DELETE', `/containers/${encodeURIComponent(containerName)}?force=true`);
  if (status === 204 || status === 404) return;
  throw new Error(`Docker remove failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

async function execInContainer(containerName, cmd, timeoutMs = 5000) {
  const createRes = await dockerApi('POST',
    `/containers/${encodeURIComponent(containerName)}/exec`,
    { Cmd: ['sh', '-c', cmd], AttachStdout: true, AttachStderr: false }
  );
  if (createRes.status !== 201 || !createRes.data?.Id) {
    throw new Error(`Docker exec create failed (${createRes.status}): ${createRes.data?.message || ''}`);
  }

  const execId = createRes.data.Id;
  const buf = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
    const req = http.request({
      socketPath: '/var/run/docker.sock',
      path: `/exec/${execId}/start`,
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      res.on('end', () => { clearTimeout(timer); resolve(Buffer.concat(chunks)); });
    });
    req.on('error', (err) => { clearTimeout(timer); reject(err); });
    req.write(JSON.stringify({ Detach: false, Tty: false }));
    req.end();
  });

  let stdout = '';
  let offset = 0;
  while (offset + 8 <= buf.length) {
    const size = buf.readUInt32BE(offset + 4);
    if (offset + 8 + size > buf.length) break;
    if (buf[offset] === 1) {
      stdout += buf.slice(offset + 8, offset + 8 + size).toString('utf8');
    }
    offset += 8 + size;
  }

  return stdout;
}

async function tailContainerLogs(containerName) {
  return dockerApiStream('GET',
    `/containers/${encodeURIComponent(containerName)}/logs?stdout=true&stderr=true&follow=true&tail=all`
  );
}

async function waitForContainer(containerName) {
  const { status, data } = await dockerApi('POST', `/containers/${encodeURIComponent(containerName)}/wait`);
  clearTrackedJob(containerName);
  if (status === 200) return data.StatusCode;
  throw new Error(`Docker wait failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

async function removeVolume(volumeName) {
  const { status, data } = await dockerApi('DELETE', `/volumes/${encodeURIComponent(volumeName)}`);
  if (status === 204 || status === 404) return;
  throw new Error(`Docker volume remove failed (${status}): ${data?.message || JSON.stringify(data)}`);
}

async function getContainerStats(containerName) {
  const { status, data } = await dockerApi('GET',
    `/containers/${encodeURIComponent(containerName)}/stats?stream=false`
  );
  if (status !== 200 || !data) return null;

  const cpuDelta = (data.cpu_stats?.cpu_usage?.total_usage || 0) - (data.precpu_stats?.cpu_usage?.total_usage || 0);
  const systemDelta = (data.cpu_stats?.system_cpu_usage || 0) - (data.precpu_stats?.system_cpu_usage || 0);
  const numCpus = data.cpu_stats?.online_cpus || data.cpu_stats?.cpu_usage?.percpu_usage?.length || 1;
  const cpu = systemDelta > 0 ? (cpuDelta / systemDelta) * numCpus * 100 : 0;

  let netRx = 0;
  let netTx = 0;
  if (data.networks) {
    for (const iface of Object.values(data.networks)) {
      netRx += iface.rx_bytes || 0;
      netTx += iface.tx_bytes || 0;
    }
  }

  return {
    cpu: Math.round(cpu * 100) / 100,
    memUsage: data.memory_stats?.usage || 0,
    memLimit: data.memory_stats?.limit || 0,
    netRx,
    netTx,
  };
}

async function listContainers(namePrefix) {
  const filters = JSON.stringify({ name: [`^/${namePrefix}`] });
  const { status, data } = await dockerApi('GET',
    `/containers/json?all=true&filters=${encodeURIComponent(filters)}`
  );
  if (status !== 200 || !Array.isArray(data)) return [];
  return data.map((container) => ({
    id: container.Id,
    name: (container.Names?.[0] || '').replace(/^\//, ''),
    state: container.State,
  }));
}

export {
  execInContainer,
  getContainerStats,
  inspectContainer,
  launchContainer,
  listContainers,
  removeContainer,
  removeVolume,
  resolveHostPath,
  startContainer,
  stopContainer,
  tailContainerLogs,
  waitForContainer,
};
