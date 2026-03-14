import { PROJECT_ROOT, clusterDataDir } from '../paths.js';

const DEFAULT_ALLOWED_IMAGE_PREFIXES = [
  'stephengpope/thepopebot:claude-code-workspace-',
  'stephengpope/thepopebot:claude-code-headless-',
  'stephengpope/thepopebot:claude-code-cluster-worker-',
];

const POLICY_BY_KIND = {
  workspace: {
    maxCpu: Number(process.env.JOB_RUNNER_WORKSPACE_MAX_CPU || 2),
    maxMemory: process.env.JOB_RUNNER_WORKSPACE_MAX_MEMORY || '4g',
    maxPids: Number(process.env.JOB_RUNNER_WORKSPACE_MAX_PIDS || 512),
    maxRuntimeMs: Number(process.env.JOB_RUNNER_WORKSPACE_MAX_RUNTIME_MS || 8 * 60 * 60 * 1000),
  },
  headless: {
    maxCpu: Number(process.env.JOB_RUNNER_HEADLESS_MAX_CPU || 2),
    maxMemory: process.env.JOB_RUNNER_HEADLESS_MAX_MEMORY || '4g',
    maxPids: Number(process.env.JOB_RUNNER_HEADLESS_MAX_PIDS || 256),
    maxRuntimeMs: Number(process.env.JOB_RUNNER_HEADLESS_MAX_RUNTIME_MS || 30 * 60 * 1000),
  },
  cluster: {
    maxCpu: Number(process.env.JOB_RUNNER_CLUSTER_MAX_CPU || 2),
    maxMemory: process.env.JOB_RUNNER_CLUSTER_MAX_MEMORY || '4g',
    maxPids: Number(process.env.JOB_RUNNER_CLUSTER_MAX_PIDS || 256),
    maxRuntimeMs: Number(process.env.JOB_RUNNER_CLUSTER_MAX_RUNTIME_MS || 30 * 60 * 1000),
  },
  default: {
    maxCpu: Number(process.env.JOB_RUNNER_MAX_CPU || 2),
    maxMemory: process.env.JOB_RUNNER_MAX_MEMORY || '4g',
    maxPids: Number(process.env.JOB_RUNNER_MAX_PIDS || 256),
    maxRuntimeMs: Number(process.env.JOB_RUNNER_MAX_RUNTIME_MS || 30 * 60 * 1000),
  },
};

function getAllowedImagePrefixes() {
  const custom = (process.env.JOB_RUNNER_ALLOWED_IMAGES || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  return custom.length > 0 ? custom : DEFAULT_ALLOWED_IMAGE_PREFIXES;
}

function parseMemoryToBytes(value) {
  if (typeof value === 'number') return value;
  if (!value) return 0;
  const match = String(value).trim().toLowerCase().match(/^(\d+(?:\.\d+)?)([kmgt]?)b?$/);
  if (!match) {
    throw new Error(`Invalid memory limit: ${value}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];
  const multipliers = {
    '': 1,
    k: 1024,
    m: 1024 ** 2,
    g: 1024 ** 3,
    t: 1024 ** 4,
  };
  return Math.floor(amount * multipliers[unit]);
}

function parseMount(bind) {
  const parts = String(bind).split(':');
  if (parts.length < 2) {
    throw new Error(`Invalid bind mount: ${bind}`);
  }
  const source = parts[0];
  const target = parts[1];
  const mode = parts.slice(2).join(':') || '';
  return { source, target, mode };
}

function isNamedVolume(source) {
  return !source.startsWith('/');
}

function getAllowedHostRoots(hostProjectRoot = PROJECT_ROOT) {
  const roots = [
    hostProjectRoot,
    clusterDataDir,
  ];
  return roots.filter(Boolean);
}

function ensureAllowedImage(image) {
  const allowed = getAllowedImagePrefixes();
  if (!allowed.some((prefix) => image.startsWith(prefix))) {
    throw new Error(`Image not allowed by job runner policy: ${image}`);
  }
}

function ensureAllowedMountPaths(binds = [], options = {}) {
  const allowedRoots = getAllowedHostRoots(options.hostProjectRoot);

  for (const bind of binds) {
    const { source, target } = parseMount(bind);
    if (!target.startsWith('/home/claude-code/')) {
      throw new Error(`Mount target not allowed: ${target}`);
    }

    if (isNamedVolume(source)) {
      if (!source.startsWith('code-workspace-')) {
        throw new Error(`Named volume not allowed: ${source}`);
      }
      continue;
    }

    const normalizedSource = source.replace(/\\/g, '/');
    const allowed = allowedRoots.some((root) => {
      const normalizedRoot = String(root).replace(/\\/g, '/');
      return normalizedSource === normalizedRoot || normalizedSource.startsWith(`${normalizedRoot}/`);
    });

    if (!allowed) {
      throw new Error(`Host path not allowed by job runner policy: ${source}`);
    }
  }
}

function getPolicyForJobKind(jobKind = 'default') {
  return POLICY_BY_KIND[jobKind] || POLICY_BY_KIND.default;
}

function normalizeRuntimeLimits(jobKind, overrides = {}) {
  const base = getPolicyForJobKind(jobKind);
  const maxCpu = Math.min(
    Number(overrides.maxCpu || base.maxCpu),
    Number(base.maxCpu)
  );
  const maxMemory = Math.min(
    parseMemoryToBytes(overrides.maxMemory || base.maxMemory),
    parseMemoryToBytes(base.maxMemory)
  );
  const maxPids = Math.min(
    Number(overrides.maxPids || base.maxPids),
    Number(base.maxPids)
  );
  const maxRuntimeMs = Math.min(
    Number(overrides.maxRuntimeMs || base.maxRuntimeMs),
    Number(base.maxRuntimeMs)
  );

  return {
    maxCpu,
    maxMemory,
    maxPids,
    maxRuntimeMs,
  };
}

export {
  ensureAllowedImage,
  ensureAllowedMountPaths,
  getPolicyForJobKind,
  normalizeRuntimeLimits,
  parseMemoryToBytes,
};
