'use client';

import { useEffect, useState } from 'react';
import {
  createWorkspaceInviteRecord,
  createWorkspaceProjectRecord,
  createWorkspaceTaskRecord,
  getWorkspaceDetail,
} from '../actions.js';
import { PageLayout } from './page-layout.js';

function Section({ title, description, children, action }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold">{title}</h2>
          {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Empty({ text }) {
  return <p className="text-sm text-muted-foreground">{text}</p>;
}

export function WorkspaceDetailPage({ session, workspaceId }) {
  const [state, setState] = useState(null);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('collaborator');
  const [projectName, setProjectName] = useState('');
  const [projectRepo, setProjectRepo] = useState('');
  const [taskTitle, setTaskTitle] = useState('');
  const [copiedInvite, setCopiedInvite] = useState('');

  const load = async () => {
    const detail = await getWorkspaceDetail(workspaceId);
    setState(detail);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [workspaceId]);

  if (!state) {
    return (
      <PageLayout session={session}>
        <div className="py-10 text-sm text-muted-foreground">Loading workspace…</div>
      </PageLayout>
    );
  }

  if (!state.workspace) {
    return (
      <PageLayout session={session}>
        <div className="py-10 text-sm text-muted-foreground">Workspace not found.</div>
      </PageLayout>
    );
  }

  const { workspace, members, invites, projects, tasks, activity, conversations, memory } = state;
  const canInvite = workspace.role === 'owner';

  const createInvite = async (e) => {
    e.preventDefault();
    const invite = await createWorkspaceInviteRecord(workspaceId, {
      email: inviteEmail.trim() || null,
      role: inviteRole,
    });
    setInviteEmail('');
    await navigator.clipboard.writeText(invite.inviteUrl);
    setCopiedInvite(invite.inviteUrl);
    setTimeout(() => setCopiedInvite(''), 4000);
    await load();
  };

  const createProject = async (e) => {
    e.preventDefault();
    if (!projectName.trim()) return;
    await createWorkspaceProjectRecord(workspaceId, {
      name: projectName.trim(),
      repository: projectRepo.trim(),
    });
    setProjectName('');
    setProjectRepo('');
    await load();
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!taskTitle.trim()) return;
    await createWorkspaceTaskRecord(workspaceId, {
      title: taskTitle.trim(),
      status: 'draft',
    });
    setTaskTitle('');
    await load();
  };

  return (
    <PageLayout session={session}>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-start gap-4">
            <span className="mt-1 inline-block h-4 w-4 rounded-full" style={{ backgroundColor: workspace.color || '#7c8bff' }} />
            <div>
              <h1 className="text-2xl font-semibold">{workspace.name}</h1>
              {workspace.description && (
                <p className="mt-1 text-sm text-muted-foreground">{workspace.description}</p>
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground uppercase tracking-wide">
                <span>Your role: {workspace.role}</span>
                <span>Members: {members.length}</span>
                <span>Projects: {projects.length}</span>
                <span>Tasks: {tasks.length}</span>
              </div>
            </div>
          </div>
        </div>

        <Section
          title="Members & Invites"
          description="Bring people into the workspace and keep roles simple for now."
          action={copiedInvite ? <span className="text-xs text-emerald-600">Invite link copied</span> : null}
        >
          <div className="grid gap-6 lg:grid-cols-2">
            <div>
              <div className="mb-2 text-sm font-medium">Members</div>
              <div className="space-y-2">
                {members.length === 0 ? <Empty text="No members yet." /> : members.map((member) => (
                  <div key={member.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                    <div className="font-medium">{member.userId}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">{member.role}</div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Create invite</div>
              {canInvite ? (
                <form onSubmit={createInvite} className="space-y-3">
                  <input
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                    placeholder="Email (optional)"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                  <select
                    value={inviteRole}
                    onChange={(e) => setInviteRole(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="collaborator">Collaborator</option>
                    <option value="reviewer">Reviewer</option>
                  </select>
                  <button className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90">
                    Create invite
                  </button>
                </form>
              ) : (
                <Empty text="Only owners can create invites." />
              )}

              <div className="mt-4 space-y-2">
                {invites.length === 0 ? <Empty text="No invites yet." /> : invites.map((invite) => (
                  <div key={invite.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                    <div className="font-medium">{invite.email || 'Invite link only'}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">
                      {invite.role} · {invite.status}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Section>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Projects" description="Attach repositories or project contexts to this workspace.">
            <form onSubmit={createProject} className="space-y-3">
              <input
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="Project name"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <input
                value={projectRepo}
                onChange={(e) => setProjectRepo(e.target.value)}
                placeholder="Repository (optional)"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90">
                Add project
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {projects.length === 0 ? <Empty text="No projects yet." /> : projects.map((project) => (
                <div key={project.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <div className="font-medium">{project.name}</div>
                  <div className="text-xs text-muted-foreground">{project.repository || 'No repository linked yet'}</div>
                </div>
              ))}
            </div>
          </Section>

          <Section title="Tasks" description="Track shared work items before we wire the full execution flow in.">
            <form onSubmit={createTask} className="space-y-3">
              <input
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Task title"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
              <button className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90">
                Add task
              </button>
            </form>
            <div className="mt-4 space-y-2">
              {tasks.length === 0 ? <Empty text="No tasks yet." /> : tasks.map((task) => (
                <div key={task.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <div className="font-medium">{task.title}</div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">{task.status}</div>
                </div>
              ))}
            </div>
          </Section>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Shared conversations" description="Conversation scaffolding for the next phase of shared chat.">
            {conversations.length === 0 ? <Empty text="No shared conversations yet." /> : (
              <div className="space-y-2">
                {conversations.map((conversation) => (
                  <div key={conversation.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                    <div className="font-medium">{conversation.title}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>

          <Section title="Workspace memory" description="Shared learnings and retained decisions for this project room.">
            {memory.length === 0 ? <Empty text="No workspace memory yet." /> : (
              <div className="space-y-2">
                {memory.map((entry) => (
                  <div key={entry.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                    <div className="font-medium">{entry.title}</div>
                    <div className="text-xs text-muted-foreground uppercase tracking-wide">{entry.type}</div>
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>

        <Section title="Activity" description="What has happened in this workspace so far.">
          {activity.length === 0 ? <Empty text="No activity yet." /> : (
            <div className="space-y-2">
              {activity.map((item) => (
                <div key={item.id} className="rounded-lg border border-border/70 px-3 py-2 text-sm">
                  <div className="font-medium">{item.type}</div>
                  <div className="text-xs text-muted-foreground">{new Date(item.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>
    </PageLayout>
  );
}
