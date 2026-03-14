import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').notNull().default('admin'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const chats = sqliteTable('chats', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  title: text('title').notNull().default('New Chat'),
  starred: integer('starred').notNull().default(0),
  codeWorkspaceId: text('code_workspace_id'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  chatId: text('chat_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  notification: text('notification').notNull(),
  payload: text('payload').notNull(),
  read: integer('read').notNull().default(0),
  createdAt: integer('created_at').notNull(),
});

export const subscriptions = sqliteTable('subscriptions', {
  id: text('id').primaryKey(),
  platform: text('platform').notNull(),
  channelId: text('channel_id').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const codeWorkspaces = sqliteTable('code_workspaces', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  containerName: text('container_name').unique(),
  repo: text('repo'),
  branch: text('branch'),
  featureBranch: text('feature_branch'),
  title: text('title').notNull().default('Code Workspace'),
  codingAgent: text('coding_agent').notNull().default('claude-code'),
  lastInteractiveCommit: text('last_interactive_commit'),
  starred: integer('starred').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const clusters = sqliteTable('clusters', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull(),
  name: text('name').notNull().default('New Cluster'),
  systemPrompt: text('system_prompt').notNull().default(''),
  folders: text('folders'),
  enabled: integer('enabled').notNull().default(0),
  starred: integer('starred').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const clusterRoles = sqliteTable('cluster_roles', {
  id: text('id').primaryKey(),
  clusterId: text('cluster_id').notNull(),
  roleName: text('role_name').notNull(),
  role: text('role').notNull().default(''),
  prompt: text('prompt').notNull().default('Execute your role.'),
  triggerConfig: text('trigger_config'),
  maxConcurrency: integer('max_concurrency').notNull().default(1),
  cleanupWorkerDir: integer('cleanup_worker_dir').notNull().default(0),
  folders: text('folders'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const settings = sqliteTable('settings', {
  id: text('id').primaryKey(),
  type: text('type').notNull(),
  key: text('key').notNull(),
  value: text('value').notNull(),
  createdBy: text('created_by'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const workspaces = sqliteTable('workspaces', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description').notNull().default(''),
  color: text('color').notNull().default(''),
  icon: text('icon').notNull().default(''),
  ownerUserId: text('owner_user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const workspaceMembers = sqliteTable('workspace_members', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  userId: text('user_id').notNull(),
  role: text('role').notNull().default('collaborator'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const workspaceInvites = sqliteTable('workspace_invites', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  email: text('email'),
  token: text('token').notNull().unique(),
  role: text('role').notNull().default('collaborator'),
  invitedByUserId: text('invited_by_user_id').notNull(),
  acceptedByUserId: text('accepted_by_user_id'),
  status: text('status').notNull().default('pending'),
  expiresAt: integer('expires_at'),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const workspaceProjects = sqliteTable('workspace_projects', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  name: text('name').notNull(),
  repository: text('repository').notNull().default(''),
  defaultBranch: text('default_branch').notNull().default('main'),
  notes: text('notes').notNull().default(''),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const workspaceConversations = sqliteTable('workspace_conversations', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  projectId: text('project_id'),
  title: text('title').notNull(),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const workspaceMessages = sqliteTable('workspace_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  createdByUserId: text('created_by_user_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  createdAt: integer('created_at').notNull(),
});

export const workspaceTasks = sqliteTable('workspace_tasks', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  projectId: text('project_id'),
  conversationId: text('conversation_id'),
  title: text('title').notNull(),
  status: text('status').notNull().default('draft'),
  planningArtifacts: text('planning_artifacts'),
  governanceState: text('governance_state'),
  executionState: text('execution_state'),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const workspaceActivityEvents = sqliteTable('workspace_activity_events', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  actorUserId: text('actor_user_id'),
  type: text('type').notNull(),
  payload: text('payload').notNull().default('{}'),
  createdAt: integer('created_at').notNull(),
});

export const workspaceMemoryEntries = sqliteTable('workspace_memory_entries', {
  id: text('id').primaryKey(),
  workspaceId: text('workspace_id').notNull(),
  type: text('type').notNull(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  metadata: text('metadata'),
  createdByUserId: text('created_by_user_id').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});
