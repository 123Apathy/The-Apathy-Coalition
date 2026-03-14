import http from 'http';

function getJobRunnerConfig() {
  const baseUrl = process.env.JOB_RUNNER_URL || 'http://job-runner:8787';
  const token = process.env.JOB_RUNNER_TOKEN || process.env.AUTH_SECRET || '';
  return { baseUrl: new URL(baseUrl), token };
}

function jobRunnerRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const { baseUrl, token } = getJobRunnerConfig();
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request({
      hostname: baseUrl.hostname,
      port: baseUrl.port,
      protocol: baseUrl.protocol,
      path,
      method,
      headers: {
        'Content-Type': 'application/json',
        'x-job-runner-token': token,
        ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
      },
    }, (res) => {
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
    if (payload) req.write(payload);
    req.end();
  });
}

function jobRunnerStream(path) {
  return new Promise((resolve, reject) => {
    const { baseUrl, token } = getJobRunnerConfig();
    const req = http.request({
      hostname: baseUrl.hostname,
      port: baseUrl.port,
      protocol: baseUrl.protocol,
      path,
      method: 'GET',
      headers: {
        'x-job-runner-token': token,
      },
    }, resolve);
    req.on('error', reject);
    req.end();
  });
}

function volumeName(workspaceId) {
  const shortId = workspaceId.replace(/-/g, '').slice(0, 8);
  return `code-workspace-${shortId}`;
}

async function runContainer({ containerName, image, env = [], workingDir, hostConfig = {}, jobKind = 'default', limits = {} }) {
  const response = await jobRunnerRequest('POST', '/run-job', {
    containerName,
    image,
    env,
    workingDir,
    hostConfig,
    jobKind,
    limits,
  });

  if (response.status !== 200) {
    throw new Error(`Job runner launch failed (${response.status}): ${response.data?.error || response.data?.message || JSON.stringify(response.data)}`);
  }

  return response.data;
}

async function runCodeWorkspaceContainer({ containerName, repo, branch, codingAgent = 'claude-code', featureBranch, workspaceId, chatContext }) {
  if (codingAgent !== 'claude-code') {
    throw new Error(`Unsupported coding agent: ${codingAgent}`);
  }

  const version = process.env.THEPOPEBOT_VERSION;
  const image = `stephengpope/thepopebot:claude-code-workspace-${version}`;

  const env = [
    `REPO=${repo}`,
    `BRANCH=${branch}`,
  ];
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) env.push(`CLAUDE_CODE_OAUTH_TOKEN=${process.env.CLAUDE_CODE_OAUTH_TOKEN}`);
  if (process.env.GH_TOKEN) env.push(`GH_TOKEN=${process.env.GH_TOKEN}`);
  if (featureBranch) env.push(`FEATURE_BRANCH=${featureBranch}`);
  if (chatContext) env.push(`CHAT_CONTEXT=${chatContext}`);

  const hostConfig = {};
  if (workspaceId) {
    hostConfig.Binds = [`${volumeName(workspaceId)}:/home/claude-code/workspace`];
  }

  return runContainer({
    containerName,
    image,
    env,
    hostConfig,
    jobKind: 'workspace',
  });
}

async function inspectContainer(containerName) {
  const response = await jobRunnerRequest('GET', `/job-status?containerName=${encodeURIComponent(containerName)}`);
  if (response.status === 200) return response.data.container || null;
  if (response.status === 404) return null;
  throw new Error(`Job runner inspect failed (${response.status}): ${response.data?.error || JSON.stringify(response.data)}`);
}

async function startContainer(containerName) {
  const response = await jobRunnerRequest('POST', '/start-job', { containerName });
  if (response.status !== 200) {
    throw new Error(`Job runner start failed (${response.status}): ${response.data?.error || JSON.stringify(response.data)}`);
  }
}

async function removeContainer(containerName) {
  const response = await jobRunnerRequest('POST', '/stop-job', { containerName, remove: true });
  if (response.status !== 200) {
    throw new Error(`Job runner remove failed (${response.status}): ${response.data?.error || JSON.stringify(response.data)}`);
  }
}

async function runHeadlessCodeContainer({ containerName, repo, branch, featureBranch, workspaceId, taskPrompt }) {
  const version = process.env.THEPOPEBOT_VERSION;
  const image = `stephengpope/thepopebot:claude-code-headless-${version}`;

  const env = [
    `REPO=${repo}`,
    `BRANCH=${branch}`,
    `FEATURE_BRANCH=${featureBranch}`,
    `HEADLESS_TASK=${taskPrompt}`,
  ];
  if (process.env.CLAUDE_CODE_OAUTH_TOKEN) env.push(`CLAUDE_CODE_OAUTH_TOKEN=${process.env.CLAUDE_CODE_OAUTH_TOKEN}`);
  if (process.env.GH_TOKEN) env.push(`GH_TOKEN=${process.env.GH_TOKEN}`);

  return runContainer({
    containerName,
    image,
    env,
    jobKind: 'headless',
    hostConfig: {
      Binds: [`${volumeName(workspaceId)}:/home/claude-code/workspace`],
    },
  });
}

async function runClusterWorkerContainer({ containerName, image, env = [], binds = [], workingDir }) {
  const version = process.env.THEPOPEBOT_VERSION;
  const resolvedImage = image || `stephengpope/thepopebot:claude-code-cluster-worker-${version}`;

  return runContainer({
    containerName,
    image: resolvedImage,
    env,
    workingDir,
    jobKind: 'cluster',
    hostConfig: {
      AutoRemove: true,
      ...(binds.length > 0 ? { Binds: binds } : {}),
    },
  });
}

async function execInContainer(containerName, cmd, timeoutMs = 5000) {
  try {
    const response = await jobRunnerRequest('POST', '/exec-job', {
      containerName,
      cmd,
      timeoutMs,
    });
    if (response.status !== 200) return null;
    return response.data.output ?? null;
  } catch (err) {
    console.error(`[execInContainer] container=${containerName} cmd=${cmd}`, err.message || err);
    return null;
  }
}

async function tailContainerLogs(containerName) {
  return jobRunnerStream(`/job-logs?containerName=${encodeURIComponent(containerName)}`);
}

async function waitForContainer(containerName) {
  const response = await jobRunnerRequest('POST', '/wait-job', { containerName });
  if (response.status === 200) return response.data.exitCode;
  throw new Error(`Job runner wait failed (${response.status}): ${response.data?.error || JSON.stringify(response.data)}`);
}

async function removeCodeWorkspaceVolume(workspaceId) {
  const response = await jobRunnerRequest('POST', '/remove-volume', {
    volumeName: volumeName(workspaceId),
  });
  if (response.status !== 200) {
    throw new Error(`Job runner volume remove failed (${response.status}): ${response.data?.error || JSON.stringify(response.data)}`);
  }
}

async function stopContainer(containerName) {
  const response = await jobRunnerRequest('POST', '/stop-job', { containerName, remove: false });
  if (response.status !== 200) {
    throw new Error(`Job runner stop failed (${response.status}): ${response.data?.error || JSON.stringify(response.data)}`);
  }
}

async function resolveHostPath(containerPath) {
  const response = await jobRunnerRequest('POST', '/resolve-host-path', { containerPath });
  if (response.status === 200) return response.data.hostPath;
  return containerPath;
}

async function getContainerStats(containerName) {
  const response = await jobRunnerRequest('GET', `/container-stats?containerName=${encodeURIComponent(containerName)}`);
  if (response.status === 200) return response.data.stats;
  return null;
}

async function listContainers(namePrefix) {
  const response = await jobRunnerRequest('GET', `/containers?namePrefix=${encodeURIComponent(namePrefix)}`);
  if (response.status === 200 && Array.isArray(response.data.containers)) {
    return response.data.containers;
  }
  return [];
}

export {
  runCodeWorkspaceContainer,
  runHeadlessCodeContainer,
  runClusterWorkerContainer,
  inspectContainer,
  startContainer,
  stopContainer,
  removeContainer,
  execInContainer,
  tailContainerLogs,
  waitForContainer,
  removeCodeWorkspaceVolume,
  resolveHostPath,
  getContainerStats,
  listContainers,
};
