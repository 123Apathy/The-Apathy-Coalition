import http from 'http';
import {
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
} from './container-launcher.js';
import { getTrackedJob, listTrackedJobs, startJobReaper } from './job-limits.js';

function getAuthToken() {
  return process.env.JOB_RUNNER_TOKEN || process.env.AUTH_SECRET || '';
}

function isAuthorized(req) {
  const token = getAuthToken();
  if (!token) return false;
  return req.headers['x-job-runner-token'] === token;
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function readJson(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

async function handleRunJob(req, res) {
  const body = await readJson(req);
  const result = await launchContainer(body);
  sendJson(res, 200, result);
}

async function handleStopJob(req, res) {
  const body = await readJson(req);
  if (!body?.containerName) {
    sendJson(res, 400, { error: 'containerName is required' });
    return;
  }
  if (body.remove) {
    await removeContainer(body.containerName);
  } else {
    await stopContainer(body.containerName);
  }
  sendJson(res, 200, { ok: true });
}

async function handleStartJob(req, res) {
  const body = await readJson(req);
  if (!body?.containerName) {
    sendJson(res, 400, { error: 'containerName is required' });
    return;
  }
  await startContainer(body.containerName);
  sendJson(res, 200, { ok: true });
}

async function handleJobStatus(req, res, url) {
  const containerName = url.searchParams.get('containerName');
  if (!containerName) {
    sendJson(res, 400, { error: 'containerName is required' });
    return;
  }
  const info = await inspectContainer(containerName);
  sendJson(res, 200, {
    container: info,
    tracked: getTrackedJob(containerName),
  });
}

async function handleExecJob(req, res) {
  const body = await readJson(req);
  if (!body?.containerName || !body?.cmd) {
    sendJson(res, 400, { error: 'containerName and cmd are required' });
    return;
  }
  const output = await execInContainer(body.containerName, body.cmd, body.timeoutMs || 5000);
  sendJson(res, 200, { output });
}

async function handleWaitJob(req, res) {
  const body = await readJson(req);
  if (!body?.containerName) {
    sendJson(res, 400, { error: 'containerName is required' });
    return;
  }
  const exitCode = await waitForContainer(body.containerName);
  sendJson(res, 200, { exitCode });
}

async function handleLogs(req, res, url) {
  const containerName = url.searchParams.get('containerName');
  if (!containerName) {
    sendJson(res, 400, { error: 'containerName is required' });
    return;
  }

  const stream = await tailContainerLogs(containerName);
  res.writeHead(200, { 'Content-Type': 'application/octet-stream' });
  stream.pipe(res);
  stream.on('error', () => res.destroy());
}

async function handleRemoveVolume(req, res) {
  const body = await readJson(req);
  if (!body?.volumeName) {
    sendJson(res, 400, { error: 'volumeName is required' });
    return;
  }
  await removeVolume(body.volumeName);
  sendJson(res, 200, { ok: true });
}

async function handleContainerStats(req, res, url) {
  const containerName = url.searchParams.get('containerName');
  if (!containerName) {
    sendJson(res, 400, { error: 'containerName is required' });
    return;
  }
  const stats = await getContainerStats(containerName);
  sendJson(res, 200, { stats });
}

async function handleListContainers(req, res, url) {
  const namePrefix = url.searchParams.get('namePrefix') || '';
  const containers = await listContainers(namePrefix);
  sendJson(res, 200, { containers });
}

async function handleResolveHostPath(req, res) {
  const body = await readJson(req);
  if (!body?.containerPath) {
    sendJson(res, 400, { error: 'containerPath is required' });
    return;
  }
  const hostPath = await resolveHostPath(body.containerPath);
  sendJson(res, 200, { hostPath });
}

async function handleTrackedJobs(req, res) {
  sendJson(res, 200, { jobs: listTrackedJobs() });
}

function startJobRunnerServer(options = {}) {
  const port = Number(options.port || process.env.JOB_RUNNER_PORT || 8787);
  const host = options.host || process.env.JOB_RUNNER_HOST || '0.0.0.0';

  startJobReaper(inspectContainer);

  const server = http.createServer(async (req, res) => {
    try {
      if (!isAuthorized(req)) {
        sendJson(res, 401, { error: 'Unauthorized' });
        return;
      }

      const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
      if (req.method === 'POST' && url.pathname === '/run-job') {
        await handleRunJob(req, res);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/stop-job') {
        await handleStopJob(req, res);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/start-job') {
        await handleStartJob(req, res);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/job-status') {
        await handleJobStatus(req, res, url);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/exec-job') {
        await handleExecJob(req, res);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/wait-job') {
        await handleWaitJob(req, res);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/job-logs') {
        await handleLogs(req, res, url);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/remove-volume') {
        await handleRemoveVolume(req, res);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/container-stats') {
        await handleContainerStats(req, res, url);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/containers') {
        await handleListContainers(req, res, url);
        return;
      }
      if (req.method === 'POST' && url.pathname === '/resolve-host-path') {
        await handleResolveHostPath(req, res);
        return;
      }
      if (req.method === 'GET' && url.pathname === '/tracked-jobs') {
        await handleTrackedJobs(req, res);
        return;
      }

      sendJson(res, 404, { error: 'Not found' });
    } catch (err) {
      console.error('[job-runner] request failed:', err);
      sendJson(res, 500, { error: err.message || 'Internal error' });
    }
  });

  server.listen(port, host, () => {
    console.log(`[job-runner] listening on http://${host}:${port}`);
  });

  return server;
}

if (process.argv[1] && import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
  startJobRunnerServer();
}

export { startJobRunnerServer };
