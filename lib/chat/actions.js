'use server';

import { auth } from '../auth/index.js';
import {
  createChat as dbCreateChat,
  getChatById,
  getChatByWorkspaceId,
  getMessagesByChatId,
  deleteChat as dbDeleteChat,
  deleteAllChatsByUser,
  updateChatTitle,
  toggleChatStarred,
} from '../db/chats.js';
import {
  getNotifications as dbGetNotifications,
  markAllRead as dbMarkAllRead,
} from '../db/notifications.js';
import { setUserSettings } from '../db/user-settings.js';
import { buildUserSettingsBundle, filterNotificationsBySettings } from '../user-preferences.js';
import { detectModelProfile, inspectLocalSystem } from '../runtime/model-profiles.js';
import { getUserDataRoot } from '../runtime/user-data.js';
import { getUpdateManifest } from '../runtime/update-manifest.js';
import { getWorkspaceBackendStatus, initializeWorkspaceBackendState } from '../workspaces/backend.js';

/**
 * Get the authenticated user or throw.
 */
async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }
  return session.user;
}

/**
 * Get all chats for the authenticated user (includes Telegram chats).
 * @returns {Promise<object[]>}
 */
export async function getChats(limit) {
  const user = await requireAuth();
  const { or, eq, desc } = await import('drizzle-orm');
  const { getDb } = await import('../db/index.js');
  const { chats, codeWorkspaces } = await import('../db/schema.js');
  const db = getDb();
  let query = db
    .select({
      id: chats.id,
      userId: chats.userId,
      title: chats.title,
      starred: chats.starred,
      codeWorkspaceId: chats.codeWorkspaceId,
      containerName: codeWorkspaces.containerName,
      createdAt: chats.createdAt,
      updatedAt: chats.updatedAt,
    })
    .from(chats)
    .leftJoin(codeWorkspaces, eq(chats.codeWorkspaceId, codeWorkspaces.id))
    .where(or(eq(chats.userId, user.id), eq(chats.userId, 'telegram')))
    .orderBy(desc(chats.updatedAt));
  if (limit) query = query.limit(limit);
  return query.all();
}

/**
 * Get messages for a specific chat (with ownership check).
 * @param {string} chatId
 * @returns {Promise<object[]>}
 */
export async function getChatMessages(chatId) {
  const user = await requireAuth();
  const chat = getChatById(chatId);
  if (!chat || (chat.userId !== user.id && chat.userId !== 'telegram')) {
    return [];
  }
  return getMessagesByChatId(chatId);
}

/**
 * Create a new chat.
 * @param {string} [id] - Optional chat ID
 * @param {string} [title='New Chat']
 * @returns {Promise<object>}
 */
export async function createChat(id, title = 'New Chat') {
  const user = await requireAuth();
  return dbCreateChat(user.id, title, id);
}

/**
 * Delete a chat (with ownership check).
 * @param {string} chatId
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteChat(chatId) {
  const user = await requireAuth();
  const chat = getChatById(chatId);
  if (!chat || chat.userId !== user.id) {
    console.warn(`[deleteChat] denied for user=${user.id} chat=${chatId} owner=${chat?.userId || 'missing'}`);
    return { success: false };
  }
  const deleted = dbDeleteChat(chatId);
  if (!deleted) {
    console.warn(`[deleteChat] delete returned no changes for user=${user.id} chat=${chatId}`);
    return { success: false };
  }
  return { success: true };
}

/**
 * Rename a chat (with ownership check).
 * @param {string} chatId
 * @param {string} title
 * @returns {Promise<{success: boolean}>}
 */
export async function renameChat(chatId, title) {
  const user = await requireAuth();
  const chat = getChatById(chatId);
  if (!chat || chat.userId !== user.id) {
    return { success: false };
  }
  updateChatTitle(chatId, title);
  return { success: true };
}

/**
 * Toggle a chat's starred status (with ownership check).
 * @param {string} chatId
 * @returns {Promise<{success: boolean, starred?: number}>}
 */
export async function starChat(chatId) {
  const user = await requireAuth();
  const chat = getChatById(chatId);
  if (!chat || chat.userId !== user.id) {
    return { success: false };
  }
  const starred = toggleChatStarred(chatId);
  return { success: true, starred };
}

/**
 * Delete all chats for the authenticated user.
 * @returns {Promise<{success: boolean}>}
 */
export async function deleteAllChats() {
  const user = await requireAuth();
  deleteAllChatsByUser(user.id);
  return { success: true };
}

/**
 * Get notifications, newest first, with pagination.
 * @returns {Promise<{notifications: object[], hasMore: boolean}>}
 */
export async function getNotifications(limit = 25, offset = 0) {
  const user = await requireAuth();
  const bundle = buildUserSettingsBundle(user.id);
  if (!bundle.notifications.inApp) {
    return { notifications: [], hasMore: false };
  }
  const rows = dbGetNotifications(limit, offset);
  const filtered = filterNotificationsBySettings(rows, bundle.notifications);
  const hasMore = filtered.length > limit;
  return { notifications: hasMore ? filtered.slice(0, limit) : filtered, hasMore };
}

/**
 * Get count of unread notifications.
 * @returns {Promise<number>}
 */
export async function getUnreadNotificationCount() {
  const user = await requireAuth();
  const bundle = buildUserSettingsBundle(user.id);
  if (!bundle.notifications.inApp) return 0;
  const rows = dbGetNotifications(200, 0);
  const filtered = filterNotificationsBySettings(rows, bundle.notifications);
  return filtered.filter((row) => !row.read).length;
}

/**
 * Mark all notifications as read.
 * @returns {Promise<{success: boolean}>}
 */
export async function markNotificationsRead() {
  const user = await requireAuth();
  const bundle = buildUserSettingsBundle(user.id);
  if (!bundle.notifications.inApp) return { success: true };
  dbMarkAllRead();
  return { success: true };
}

/**
 * Generate a title for a new chat from the first user message.
 * @param {string} chatId
 * @param {string} firstMessage
 * @returns {Promise<void>}
 */
export async function generateChatTitle(chatId, firstMessage) {
  await requireAuth();
  const { autoTitle } = await import('../ai/index.js');
  return await autoTitle(chatId, firstMessage);
}

// ─────────────────────────────────────────────────────────────────────────────
// App info actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the installed package version and update status (auth-gated, never in client bundle).
 * @returns {Promise<{ version: string, updateAvailable: string|null }>}
 */
export async function getAppVersion() {
  await requireAuth();
  const { getInstalledVersion } = await import('../cron.js');
  const { getAvailableVersion, getReleaseNotes } = await import('../db/update-check.js');
  const version = getInstalledVersion();
  const available = getAvailableVersion();
  const isNewer = available && available !== version;
  return {
    version,
    updateAvailable: isNewer ? available : null,
    changelog: isNewer ? getReleaseNotes() : null,
  };
}

export async function getUpgradeReadiness() {
  await requireAuth();
  const { getInstalledVersion, isPrerelease } = await import('../cron.js');
  const { getAvailableVersion, getReleaseNotes } = await import('../db/update-check.js');

  const version = getInstalledVersion();
  const updateAvailable = getAvailableVersion();
  const changelog = updateAvailable ? getReleaseNotes() : null;

  const hasGitHubToken = Boolean(process.env.GH_TOKEN);
  const hasRepoTarget = Boolean(process.env.GH_OWNER && process.env.GH_REPO);
  const hasWorkflowConfig = hasGitHubToken && hasRepoTarget;
  const isLinuxRuntime = process.platform === 'linux';
  const cwd = process.cwd();
  const runtimeMode = isLinuxRuntime && cwd.startsWith('/home/')
    ? 'local-wsl-runtime'
    : isLinuxRuntime
      ? 'managed-linux-runtime'
      : 'desktop-runtime';

  const checks = [
    {
      id: 'release',
      label: 'Release metadata',
      status: updateAvailable ? 'ready' : 'idle',
      detail: updateAvailable ? `v${updateAvailable} is available` : 'No newer version detected',
    },
    {
      id: 'github',
      label: 'GitHub workflow access',
      status: hasWorkflowConfig ? 'ready' : 'blocked',
      detail: hasWorkflowConfig ? 'Workflow dispatch variables are configured' : 'Missing GH_TOKEN, GH_OWNER, or GH_REPO',
    },
    {
      id: 'mode',
      label: 'Runtime mode',
      status: runtimeMode === 'local-wsl-runtime' ? 'warn' : 'ready',
      detail: runtimeMode === 'local-wsl-runtime'
        ? 'This machine is using the local WSL runtime path and may need a local relaunch after workflow completion'
        : 'This install looks compatible with managed workflow-based upgrades',
    },
    {
      id: 'channel',
      label: 'Release channel',
      status: isPrerelease(version) ? 'warn' : 'ready',
      detail: isPrerelease(version)
        ? `Current install is on pre-release ${version}`
        : `Current install is on stable ${version}`,
    },
  ];

  const impact = runtimeMode === 'local-wsl-runtime'
    ? [
        'Triggers the GitHub upgrade workflow for the base app package.',
        'Updates the base application layer, not your personal data.',
        'Your local WSL runtime may need a relaunch after the workflow finishes.',
      ]
    : [
        'Triggers the GitHub upgrade workflow for the base app package.',
        'Updates the base application layer and managed deployment path.',
        'The app may briefly restart while the update settles.',
      ];

  const preserves = [
    'Chats stay local and are not overwritten.',
    'Personalization, appearance, and notification settings stay intact.',
    'Memory entries and learned skills are preserved.',
    'Your local model store is not modified by this workflow.',
  ];

  const nextSteps = runtimeMode === 'local-wsl-runtime'
    ? [
        'Watch the Runners page for workflow progress.',
        'Relaunch The Apathy Coalition from the shortcut after the workflow completes.',
        'If the local runtime still looks stale, resync/restart the app manually.',
      ]
    : [
        'Watch the Runners page for workflow progress.',
        'Expect a short restart window when the app swaps to the new version.',
        'Review the changelog if any behavior looks different after completion.',
      ];

  return {
    version,
    updateAvailable,
    changelog,
    runtimeMode,
    canTrigger: Boolean(updateAvailable && hasWorkflowConfig),
    checks,
    impact,
    preserves,
    nextSteps,
  };
}

export async function getSettingsBundle() {
  const user = await requireAuth();
  return buildUserSettingsBundle(user.id);
}

export async function getSystemInstallStatus() {
  await requireAuth();
  const system = inspectLocalSystem();
  const recommendedProfile = detectModelProfile(system);
  const updateManifest = getUpdateManifest();
  const workspaceBackend = getWorkspaceBackendStatus();

  if (workspaceBackend.configured && !workspaceBackend.initialized) {
    initializeWorkspaceBackendState();
  }

  return {
    productName: updateManifest.productName,
    userDataRoot: getUserDataRoot(),
    updatePreservePaths: updateManifest.preservePaths,
    system,
    recommendedProfile,
    workspaceBackend: getWorkspaceBackendStatus(),
  };
}

export async function saveSettingsSection(section, value) {
  const user = await requireAuth();
  const allowedSections = new Set(['personalization', 'memory', 'models', 'notifications', 'appearance']);
  if (!allowedSections.has(section)) {
    throw new Error(`Unsupported settings section: ${section}`);
  }

  const sanitizedValue = { ...value };
  if (section === 'memory') {
    delete sanitizedValue.stats;
  }
  if (section === 'models') {
    delete sanitizedValue.availableModels;
  }

  const current = buildUserSettingsBundle(user.id);
  const next = {
    ...current,
    [section]: {
      ...current[section],
      ...sanitizedValue,
    },
  };

  setUserSettings(user.id, { [section]: next[section] });
  return buildUserSettingsBundle(user.id);
}

/**
 * Trigger the upgrade-event-handler workflow via GitHub Actions.
 * @returns {Promise<{ success: boolean }>}
 */
export async function triggerUpgrade() {
  await requireAuth();
  const { triggerWorkflowDispatch } = await import('../tools/github.js');
  const { getAvailableVersion } = await import('../db/update-check.js');
  const targetVersion = getAvailableVersion();
  if (!targetVersion) {
    throw new Error('No upgrade target is currently available.');
  }
  await triggerWorkflowDispatch('upgrade-event-handler.yml', 'main', {
    target_version: targetVersion || '',
  });
  return { success: true, targetVersion };
}

export async function getUpgradeWorkflowStatus() {
  await requireAuth();
  const { getWorkflowRuns } = await import('../tools/github.js');
  const runsData = await getWorkflowRuns(null, { workflow: 'upgrade-event-handler.yml', page: 1, perPage: 10 });
  const runs = runsData?.workflow_runs || [];
  if (!runs.length) {
    return { run: null };
  }

  const latest = runs[0];
  return {
    run: {
      id: latest.id,
      status: latest.status,
      conclusion: latest.conclusion,
      createdAt: latest.created_at,
      updatedAt: latest.updated_at,
      htmlUrl: latest.html_url,
      branch: latest.head_branch,
      name: latest.name,
      event: latest.event,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// API Key actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create (or replace) the API key.
 * @returns {Promise<{ key: string, record: object } | { error: string }>}
 */
export async function createNewApiKey() {
  const user = await requireAuth();
  try {
    const { createApiKeyRecord } = await import('../db/api-keys.js');
    return createApiKeyRecord(user.id);
  } catch (err) {
    console.error('Failed to create API key:', err);
    return { error: 'Failed to create API key' };
  }
}

/**
 * Get the current API key metadata (no hash).
 * @returns {Promise<object|null>}
 */
export async function getApiKeys() {
  await requireAuth();
  try {
    const { getApiKey } = await import('../db/api-keys.js');
    return getApiKey();
  } catch (err) {
    console.error('Failed to get API key:', err);
    return null;
  }
}

/**
 * Delete the API key.
 * @returns {Promise<{ success: boolean } | { error: string }>}
 */
export async function deleteApiKey() {
  await requireAuth();
  try {
    const mod = await import('../db/api-keys.js');
    mod.deleteApiKey();
    return { success: true };
  } catch (err) {
    console.error('Failed to delete API key:', err);
    return { error: 'Failed to delete API key' };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Code mode actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get repositories accessible to the authenticated user.
 * @returns {Promise<{full_name: string, default_branch: string}[]>}
 */
export async function getRepositories() {
  await requireAuth();
  try {
    const { listRepositories } = await import('../tools/github.js');
    return await listRepositories();
  } catch (err) {
    console.error('Failed to get repositories:', err);
    return [];
  }
}

/**
 * Get branches for a repository.
 * @param {string} repoFullName - e.g. "owner/repo"
 * @returns {Promise<{name: string, isDefault: boolean}[]>}
 */
export async function getBranches(repoFullName) {
  await requireAuth();
  try {
    const { listBranches } = await import('../tools/github.js');
    return await listBranches(repoFullName);
  } catch (err) {
    console.error('Failed to get branches:', err);
    return [];
  }
}

/**
 * Get full chat data with optional workspace (left join).
 * @param {string} chatId
 * @returns {Promise<object|null>}
 */
export async function getChatData(chatId) {
  const user = await requireAuth();
  const { eq } = await import('drizzle-orm');
  const { getDb } = await import('../db/index.js');
  const { chats, codeWorkspaces } = await import('../db/schema.js');
  const db = getDb();
  const row = db
    .select()
    .from(chats)
    .leftJoin(codeWorkspaces, eq(chats.codeWorkspaceId, codeWorkspaces.id))
    .where(eq(chats.id, chatId))
    .get();
  if (!row) return null;
  const chat = row.chats;
  if (chat.userId !== user.id && chat.userId !== 'telegram') return null;
  const ws = row.code_workspaces;
  return {
    ...chat,
    workspace: ws?.id ? ws : null,
  };
}

/**
 * Get full chat data by workspace ID (left join).
 * @param {string} workspaceId
 * @returns {Promise<object|null>}
 */
export async function getChatDataByWorkspace(workspaceId) {
  const user = await requireAuth();
  const { eq } = await import('drizzle-orm');
  const { getDb } = await import('../db/index.js');
  const { chats, codeWorkspaces } = await import('../db/schema.js');
  const db = getDb();
  const row = db
    .select()
    .from(chats)
    .leftJoin(codeWorkspaces, eq(chats.codeWorkspaceId, codeWorkspaces.id))
    .where(eq(chats.codeWorkspaceId, workspaceId))
    .get();
  if (!row) return null;
  const chat = row.chats;
  if (chat.userId !== user.id && chat.userId !== 'telegram') return null;
  const ws = row.code_workspaces;
  return {
    chatId: chat.id,
    ...chat,
    workspace: ws?.id ? ws : null,
  };
}

/**
 * Create a code workspace (DB row + initial feature branch) for a new chat.
 * Called client-side before the stream fires so the workspace ID is available immediately.
 * @param {string} repo - e.g. "owner/repo"
 * @param {string} branch - e.g. "main"
 * @returns {Promise<{id: string, repo: string, branch: string, featureBranch: string, containerName: null}>}
 */
export async function createChatWorkspace(repo, branch) {
  const user = await requireAuth();
  const { createCodeWorkspace, updateFeatureBranch } = await import('../db/code-workspaces.js');
  const workspace = createCodeWorkspace(user.id, { repo, branch });
  const shortId = workspace.id.replace(/-/g, '').slice(0, 8);
  const featureBranch = `thepopebot/new-chat-${shortId}`;
  updateFeatureBranch(workspace.id, featureBranch);
  return {
    id: workspace.id,
    repo: workspace.repo,
    branch: workspace.branch,
    featureBranch,
    containerName: null,
  };
}

/**
 * Get workspace details by ID.
 * @param {string} workspaceId
 * @returns {Promise<{id: string, repo: string, branch: string, containerName: string|null}|null>}
 */
export async function getWorkspace(workspaceId) {
  await requireAuth();
  try {
    const { getCodeWorkspaceById } = await import('../db/code-workspaces.js');
    const ws = getCodeWorkspaceById(workspaceId);
    if (!ws) return null;
    return { id: ws.id, repo: ws.repo, branch: ws.branch, containerName: ws.containerName, codingAgent: ws.codingAgent, featureBranch: ws.featureBranch };
  } catch (err) {
    console.error('Failed to get workspace:', err);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Pull Request actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get all open pull requests from GitHub.
 * @returns {Promise<object[]>}
 */
export async function getPullRequests() {
  await requireAuth();
  try {
    const { getOpenPullRequests } = await import('../tools/github.js');
    return await getOpenPullRequests();
  } catch (err) {
    console.error('Failed to get pull requests:', err);
    return [];
  }
}

/**
 * Get the count of open pull requests.
 * @returns {Promise<number>}
 */
export async function getPullRequestCount() {
  await requireAuth();
  try {
    const { getOpenPullRequests } = await import('../tools/github.js');
    const prs = await getOpenPullRequests();
    return prs.length;
  } catch (err) {
    console.error('Failed to get pull request count:', err);
    return 0;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Runners actions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get runners status (active + completed jobs with counts).
 * @returns {Promise<object>}
 */
export async function getRunnersStatus(page = 1) {
  await requireAuth();
  try {
    const { getRunnersStatus: fetchStatus } = await import('../tools/github.js');
    return await fetchStatus(page);
  } catch (err) {
    console.error('Failed to get runners status:', err);
    return { error: 'Failed to get runners status', runs: [], hasMore: false };
  }
}

/**
 * Get runners config (crons + triggers).
 * @returns {Promise<{ crons: object[], triggers: object[] }>}
 */
export async function getRunnersConfig() {
  await requireAuth();
  const { cronsFile, triggersFile } = await import('../paths.js');
  const fs = await import('fs');
  let crons = [];
  let triggers = [];
  try { crons = JSON.parse(fs.readFileSync(cronsFile, 'utf8')); } catch {}
  try { triggers = JSON.parse(fs.readFileSync(triggersFile, 'utf8')); } catch {}
  return { crons, triggers };
}

