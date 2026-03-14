'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { createWorkspaceRecord, getWorkspaceSummaries, getSystemInstallStatus } from '../actions.js';
import { PageLayout } from './page-layout.js';

const DEFAULT_COLOR = '#7c8bff';

export function WorkspacesPage({ session }) {
  const [items, setItems] = useState([]);
  const [backend, setBackend] = useState(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState(DEFAULT_COLOR);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    const [workspaces, system] = await Promise.all([
      getWorkspaceSummaries(),
      getSystemInstallStatus(),
    ]);
    setItems(workspaces);
    setBackend(system.workspaceBackend);
  };

  useEffect(() => {
    load().catch(() => {});
  }, []);

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await createWorkspaceRecord({
        name: name.trim(),
        description: description.trim(),
        color,
      });
      setName('');
      setDescription('');
      setColor(DEFAULT_COLOR);
      await load();
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageLayout session={session}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Workspaces</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Shared project rooms for collaboration, tasks, and memory. Backend status: {backend?.configured ? 'configured' : 'not configured'}.
          </p>
        </div>

        <form onSubmit={submit} className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div>
            <h2 className="text-base font-semibold">Create workspace</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              This creates the workspace shell. Invites, shared chats, and tasks come next.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="block">
              <div className="mb-1.5 text-sm font-medium">Name</div>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Apathy Studio"
              />
            </label>

            <label className="block">
              <div className="mb-1.5 text-sm font-medium">Color</div>
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-2 py-1"
              />
            </label>
          </div>

          <label className="block">
            <div className="mb-1.5 text-sm font-medium">Description</div>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Shared project context, operating notes, and team intent."
            />
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
            >
              {saving ? 'Creating...' : 'Create workspace'}
            </button>
            <span className="text-xs text-muted-foreground">
              Owner-only for now. Invites and shared roles will build on top of this.
            </span>
          </div>
        </form>

        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">Your workspaces</h2>
          <div className="mt-4 space-y-3">
            {items.length === 0 ? (
              <p className="text-sm text-muted-foreground">No workspaces yet.</p>
            ) : items.map((workspace) => (
              <Link key={workspace.id} href={`/workspaces/${workspace.id}`} className="block rounded-lg border border-border/70 p-4 hover:bg-muted/40">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: workspace.color || DEFAULT_COLOR }} />
                      <h3 className="font-medium">{workspace.name}</h3>
                    </div>
                    {workspace.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{workspace.description}</p>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground uppercase tracking-wide">
                    {workspace.role}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
