import { randomUUID } from 'crypto';
import { and, desc, eq } from 'drizzle-orm';
import { getDb } from './index.js';
import {
  workspaceActivityEvents,
  workspaceConversations,
  workspaceInvites,
  workspaceMembers,
  workspaceMessages,
  workspaceProjects,
  workspaceTasks,
  workspaceMemoryEntries,
  workspaces,
} from './schema.js';

function now() {
  return Date.now();
}

export function createWorkspace(ownerUserId, { name, description = '', color = '', icon = '' }) {
  const db = getDb();
  const timestamp = now();
  const workspace = {
    id: randomUUID(),
    name,
    description,
    color,
    icon,
    ownerUserId,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  db.transaction((tx) => {
    tx.insert(workspaces).values(workspace).run();
    tx.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: workspace.id,
      userId: ownerUserId,
      role: 'owner',
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();
    tx.insert(workspaceActivityEvents).values({
      id: randomUUID(),
      workspaceId: workspace.id,
      actorUserId: ownerUserId,
      type: 'workspace.created',
      payload: JSON.stringify({ name }),
      createdAt: timestamp,
    }).run();
  });

  return workspace;
}

export function listWorkspacesForUser(userId) {
  const db = getDb();
  return db.select({
    id: workspaces.id,
    name: workspaces.name,
    description: workspaces.description,
    color: workspaces.color,
    icon: workspaces.icon,
    ownerUserId: workspaces.ownerUserId,
    createdAt: workspaces.createdAt,
    updatedAt: workspaces.updatedAt,
    role: workspaceMembers.role,
  })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaces.updatedAt))
    .all();
}

export function getWorkspaceForUser(workspaceId, userId) {
  const db = getDb();
  return db.select({
    id: workspaces.id,
    name: workspaces.name,
    description: workspaces.description,
    color: workspaces.color,
    icon: workspaces.icon,
    ownerUserId: workspaces.ownerUserId,
    createdAt: workspaces.createdAt,
    updatedAt: workspaces.updatedAt,
    role: workspaceMembers.role,
  })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .get();
}

export function createWorkspaceInvite(workspaceId, invitedByUserId, { email = null, token, role = 'collaborator', expiresAt = null }) {
  const db = getDb();
  const invite = {
    id: randomUUID(),
    workspaceId,
    email,
    token,
    role,
    invitedByUserId,
    status: 'pending',
    expiresAt,
    createdAt: now(),
    updatedAt: now(),
  };
  db.insert(workspaceInvites).values(invite).run();
  return invite;
}

export function acceptWorkspaceInvite(token, userId) {
  const db = getDb();
  const invite = db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token)).get();
  if (!invite || invite.status !== 'pending') return null;

  const timestamp = now();
  db.transaction((tx) => {
    tx.update(workspaceInvites)
      .set({ status: 'accepted', acceptedByUserId: userId, updatedAt: timestamp })
      .where(eq(workspaceInvites.id, invite.id))
      .run();

    tx.insert(workspaceMembers).values({
      id: randomUUID(),
      workspaceId: invite.workspaceId,
      userId,
      role: invite.role,
      createdAt: timestamp,
      updatedAt: timestamp,
    }).run();
  });

  return invite;
}

export function listWorkspaceMembers(workspaceId) {
  const db = getDb();
  return db.select().from(workspaceMembers).where(eq(workspaceMembers.workspaceId, workspaceId)).all();
}

export function listWorkspaceInvites(workspaceId) {
  const db = getDb();
  return db.select().from(workspaceInvites).where(eq(workspaceInvites.workspaceId, workspaceId)).orderBy(desc(workspaceInvites.updatedAt)).all();
}

export function getWorkspaceInvite(token) {
  const db = getDb();
  return db.select().from(workspaceInvites).where(eq(workspaceInvites.token, token)).get();
}

export function getWorkspaceInvitePreview(token) {
  const db = getDb();
  return db.select({
    id: workspaceInvites.id,
    workspaceId: workspaceInvites.workspaceId,
    email: workspaceInvites.email,
    role: workspaceInvites.role,
    status: workspaceInvites.status,
    expiresAt: workspaceInvites.expiresAt,
    workspaceName: workspaces.name,
    workspaceDescription: workspaces.description,
    workspaceColor: workspaces.color,
  })
    .from(workspaceInvites)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvites.workspaceId))
    .where(eq(workspaceInvites.token, token))
    .get();
}

export function listWorkspaceActivity(workspaceId) {
  const db = getDb();
  return db.select().from(workspaceActivityEvents).where(eq(workspaceActivityEvents.workspaceId, workspaceId)).orderBy(desc(workspaceActivityEvents.createdAt)).all();
}

export function createWorkspaceProject(workspaceId, createdByUserId, { name, repository = '', defaultBranch = 'main', notes = '' }) {
  const db = getDb();
  const project = {
    id: randomUUID(),
    workspaceId,
    name,
    repository,
    defaultBranch,
    notes,
    createdByUserId,
    createdAt: now(),
    updatedAt: now(),
  };
  db.insert(workspaceProjects).values(project).run();
  return project;
}

export function listWorkspaceProjects(workspaceId) {
  const db = getDb();
  return db.select().from(workspaceProjects).where(eq(workspaceProjects.workspaceId, workspaceId)).orderBy(desc(workspaceProjects.updatedAt)).all();
}

export function createWorkspaceConversation(workspaceId, createdByUserId, { title, projectId = null }) {
  const db = getDb();
  const record = {
    id: randomUUID(),
    workspaceId,
    projectId,
    title,
    createdByUserId,
    createdAt: now(),
    updatedAt: now(),
  };
  db.insert(workspaceConversations).values(record).run();
  return record;
}

export function listWorkspaceConversations(workspaceId) {
  const db = getDb();
  return db.select().from(workspaceConversations).where(eq(workspaceConversations.workspaceId, workspaceId)).orderBy(desc(workspaceConversations.updatedAt)).all();
}

export function getWorkspaceConversationForUser(workspaceId, conversationId, userId) {
  const db = getDb();
  return db.select({
    id: workspaceConversations.id,
    workspaceId: workspaceConversations.workspaceId,
    projectId: workspaceConversations.projectId,
    title: workspaceConversations.title,
    createdByUserId: workspaceConversations.createdByUserId,
    createdAt: workspaceConversations.createdAt,
    updatedAt: workspaceConversations.updatedAt,
  })
    .from(workspaceConversations)
    .innerJoin(workspaceMembers, eq(workspaceMembers.workspaceId, workspaceConversations.workspaceId))
    .where(
      and(
        eq(workspaceConversations.workspaceId, workspaceId),
        eq(workspaceConversations.id, conversationId),
        eq(workspaceMembers.userId, userId),
      ),
    )
    .get();
}

export function listWorkspaceMessages(conversationId) {
  const db = getDb();
  return db.select().from(workspaceMessages).where(eq(workspaceMessages.conversationId, conversationId)).orderBy(workspaceMessages.createdAt).all();
}

export function addWorkspaceMessage(conversationId, createdByUserId, { role, content }) {
  const db = getDb();
  const timestamp = now();
  const message = {
    id: randomUUID(),
    conversationId,
    createdByUserId,
    role,
    content,
    createdAt: timestamp,
  };
  db.insert(workspaceMessages).values(message).run();
  db.update(workspaceConversations).set({ updatedAt: timestamp }).where(eq(workspaceConversations.id, conversationId)).run();
  return message;
}

export function createWorkspaceTask(workspaceId, createdByUserId, input) {
  const db = getDb();
  const task = {
    id: randomUUID(),
    workspaceId,
    projectId: input.projectId || null,
    conversationId: input.conversationId || null,
    title: input.title,
    status: input.status || 'draft',
    planningArtifacts: input.planningArtifacts ? JSON.stringify(input.planningArtifacts) : null,
    governanceState: input.governanceState ? JSON.stringify(input.governanceState) : null,
    executionState: input.executionState ? JSON.stringify(input.executionState) : null,
    createdByUserId,
    createdAt: now(),
    updatedAt: now(),
  };
  db.insert(workspaceTasks).values(task).run();
  return task;
}

export function listWorkspaceTasks(workspaceId) {
  const db = getDb();
  return db.select().from(workspaceTasks).where(eq(workspaceTasks.workspaceId, workspaceId)).orderBy(desc(workspaceTasks.updatedAt)).all();
}

export function addWorkspaceActivity(workspaceId, actorUserId, type, payload = {}) {
  const db = getDb();
  const event = {
    id: randomUUID(),
    workspaceId,
    actorUserId,
    type,
    payload: JSON.stringify(payload),
    createdAt: now(),
  };
  db.insert(workspaceActivityEvents).values(event).run();
  return event;
}

export function writeWorkspaceMemory(workspaceId, createdByUserId, { type, title, content, metadata = null }) {
  const db = getDb();
  const record = {
    id: randomUUID(),
    workspaceId,
    type,
    title,
    content,
    metadata: metadata ? JSON.stringify(metadata) : null,
    createdByUserId,
    createdAt: now(),
    updatedAt: now(),
  };
  db.insert(workspaceMemoryEntries).values(record).run();
  return record;
}

export function listWorkspaceMemory(workspaceId, type = null) {
  const db = getDb();
  if (type) {
    return db.select().from(workspaceMemoryEntries)
      .where(and(eq(workspaceMemoryEntries.workspaceId, workspaceId), eq(workspaceMemoryEntries.type, type)))
      .orderBy(desc(workspaceMemoryEntries.updatedAt))
      .all();
  }
  return db.select().from(workspaceMemoryEntries)
    .where(eq(workspaceMemoryEntries.workspaceId, workspaceId))
    .orderBy(desc(workspaceMemoryEntries.updatedAt))
    .all();
}
