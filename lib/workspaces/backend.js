import fs from 'fs';
import path from 'path';
import { getUserDataRoot } from '../runtime/user-data.js';

function readWorkspaceDatabaseUrl() {
  return process.env.WORKSPACE_DATABASE_URL || process.env.DATABASE_URL || '';
}

function maskHost(host) {
  if (!host) return '';
  const parts = host.split('.');
  if (parts.length <= 2) return host;
  return `${parts[0]}.${parts[1]}.…`;
}

export function getWorkspaceBackendConfig() {
  const url = readWorkspaceDatabaseUrl();
  if (!url) {
    return {
      configured: false,
      provider: 'neon-postgres',
      mode: 'not-configured',
    };
  }

  try {
    const parsed = new URL(url);
    return {
      configured: true,
      provider: parsed.hostname.includes('neon.tech') ? 'neon-postgres' : 'postgres',
      mode: 'external-shared-backend',
      host: maskHost(parsed.hostname),
      database: parsed.pathname.replace(/^\//, ''),
      sslRequired: parsed.searchParams.get('sslmode') === 'require',
      channelBinding: parsed.searchParams.get('channel_binding') || '',
    };
  } catch {
    return {
      configured: false,
      provider: 'neon-postgres',
      mode: 'invalid-url',
    };
  }
}

export function getWorkspaceBootstrapStatePath() {
  return path.join(getUserDataRoot(), 'installer', 'workspace-backend.json');
}

export function initializeWorkspaceBackendState() {
  const config = getWorkspaceBackendConfig();
  const state = {
    initializedAt: new Date().toISOString(),
    backend: config,
    tables: [
      'workspaces',
      'workspace_members',
      'workspace_invites',
      'workspace_projects',
      'workspace_conversations',
      'workspace_messages',
      'workspace_tasks',
      'workspace_activity_events',
      'workspace_memory_entries',
    ],
  };

  const statePath = getWorkspaceBootstrapStatePath();
  fs.mkdirSync(path.dirname(statePath), { recursive: true });
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2) + '\n');
  return state;
}

export function readWorkspaceBackendState() {
  const statePath = getWorkspaceBootstrapStatePath();
  if (!fs.existsSync(statePath)) return null;
  try {
    return JSON.parse(fs.readFileSync(statePath, 'utf8'));
  } catch {
    return null;
  }
}

export function getWorkspaceBackendStatus() {
  const config = getWorkspaceBackendConfig();
  const state = readWorkspaceBackendState();
  return {
    ...config,
    initialized: Boolean(state),
    initializedAt: state?.initializedAt || null,
    tables: state?.tables || [],
  };
}
