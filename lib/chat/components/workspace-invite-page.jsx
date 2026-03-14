'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { acceptWorkspaceInviteRecord, getWorkspaceInviteDetail } from '../actions.js';
import { PageLayout } from './page-layout.js';

export function WorkspaceInvitePage({ session, token }) {
  const router = useRouter();
  const [invite, setInvite] = useState(null);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getWorkspaceInviteDetail(token).then(setInvite).catch((err) => {
      setError(err?.message || 'Failed to load invite.');
    });
  }, [token]);

  const accept = async () => {
    setAccepting(true);
    setError('');
    try {
      const result = await acceptWorkspaceInviteRecord(token);
      router.push(`/workspaces/${result.workspaceId}`);
    } catch (err) {
      setError(err?.message || 'Failed to accept invite.');
    } finally {
      setAccepting(false);
    }
  };

  return (
    <PageLayout session={session}>
      <div className="mx-auto max-w-2xl py-10">
        <div className="rounded-2xl border border-border bg-card p-6">
          <h1 className="text-2xl font-semibold">Workspace invite</h1>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          {!invite ? (
            <p className="mt-4 text-sm text-muted-foreground">Loading invite…</p>
          ) : (
            <div className="mt-4 space-y-4">
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 inline-block h-4 w-4 rounded-full"
                  style={{ backgroundColor: invite.workspaceColor || '#7c8bff' }}
                />
                <div>
                  <div className="text-lg font-medium">{invite.workspaceName}</div>
                  {invite.workspaceDescription && (
                    <p className="mt-1 text-sm text-muted-foreground">{invite.workspaceDescription}</p>
                  )}
                </div>
              </div>

              <div className="rounded-lg border border-border/70 px-4 py-3 text-sm">
                <div className="font-medium">Role</div>
                <div className="text-muted-foreground uppercase tracking-wide">{invite.role}</div>
              </div>

              <div className="rounded-lg border border-border/70 px-4 py-3 text-sm">
                <div className="font-medium">Status</div>
                <div className="text-muted-foreground uppercase tracking-wide">{invite.status}</div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={accept}
                  disabled={accepting || invite.status !== 'pending'}
                  className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
                >
                  {accepting ? 'Joining…' : 'Accept invite'}
                </button>
                <span className="text-xs text-muted-foreground">
                  You’ll be added to the shared workspace on acceptance.
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </PageLayout>
  );
}
