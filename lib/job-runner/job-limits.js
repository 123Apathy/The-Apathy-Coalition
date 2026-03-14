const activeJobs = new Map();
let reaperTimer = null;

function getConcurrencyLimit(jobKind = 'default') {
  if (jobKind === 'workspace') {
    return Number(process.env.JOB_RUNNER_MAX_CONCURRENT_WORKSPACES || 4);
  }
  if (jobKind === 'cluster') {
    return Number(process.env.JOB_RUNNER_MAX_CONCURRENT_CLUSTER_JOBS || 2);
  }
  return Number(process.env.JOB_RUNNER_MAX_CONCURRENT_JOBS || 2);
}

function countActiveJobs(jobKind) {
  let count = 0;
  for (const job of activeJobs.values()) {
    if (job.jobKind === jobKind) count += 1;
  }
  return count;
}

function assertJobCapacity(jobKind = 'default') {
  const limit = getConcurrencyLimit(jobKind);
  if (countActiveJobs(jobKind) >= limit) {
    throw new Error(`Job runner concurrency limit reached for ${jobKind}`);
  }
}

function trackJob(containerName, metadata = {}) {
  clearTrackedJob(containerName);

  const record = {
    containerName,
    jobKind: metadata.jobKind || 'default',
    startedAt: Date.now(),
    maxRuntimeMs: metadata.maxRuntimeMs || 0,
    timeout: null,
  };

  if (record.maxRuntimeMs > 0 && typeof metadata.onTimeout === 'function') {
    record.timeout = setTimeout(async () => {
      try {
        await metadata.onTimeout();
      } finally {
        clearTrackedJob(containerName);
      }
    }, record.maxRuntimeMs);
  }

  activeJobs.set(containerName, record);
  return record;
}

function clearTrackedJob(containerName) {
  const existing = activeJobs.get(containerName);
  if (!existing) return;
  if (existing.timeout) clearTimeout(existing.timeout);
  activeJobs.delete(containerName);
}

function getTrackedJob(containerName) {
  return activeJobs.get(containerName) || null;
}

function listTrackedJobs() {
  return [...activeJobs.values()].map((job) => ({
    containerName: job.containerName,
    jobKind: job.jobKind,
    startedAt: job.startedAt,
    maxRuntimeMs: job.maxRuntimeMs,
  }));
}

function startJobReaper(inspectContainer, intervalMs = 30000) {
  if (reaperTimer) return;
  reaperTimer = setInterval(async () => {
    for (const [containerName] of activeJobs.entries()) {
      try {
        const info = await inspectContainer(containerName);
        const status = info?.State?.Status;
        if (!info || !status || status === 'exited' || status === 'dead' || status === 'removing') {
          clearTrackedJob(containerName);
        }
      } catch {
        clearTrackedJob(containerName);
      }
    }
  }, intervalMs);
  reaperTimer.unref?.();
}

export {
  assertJobCapacity,
  clearTrackedJob,
  getTrackedJob,
  listTrackedJobs,
  startJobReaper,
  trackJob,
};
