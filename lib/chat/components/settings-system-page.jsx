'use client';

import { useEffect, useState } from 'react';
import { getSystemInstallStatus } from '../actions.js';

function InfoRow({ label, value, mono = false }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 py-2 last:border-b-0">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className={`text-sm text-right ${mono ? 'font-mono break-all' : ''}`}>{value}</div>
    </div>
  );
}

export function SettingsSystemPage() {
  const [state, setState] = useState(null);

  useEffect(() => {
    getSystemInstallStatus().then(setState).catch(() => {});
  }, []);

  if (!state) {
    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h2 className="text-base font-semibold">System</h2>
          <p className="mt-1 text-sm text-muted-foreground">Loading local installation details…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Installation</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          This is the local installation footprint that should stay separate from the source repository.
        </p>

        <div className="mt-4 space-y-1">
          <InfoRow label="Product" value={state.productName} />
          <InfoRow label="User data directory" value={state.userDataRoot} mono />
          <InfoRow label="Update preserves" value={state.updatePreservePaths.join(', ')} />
          <InfoRow label="Workspace backend mode" value={state.workspaceBackend.mode} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">System profile</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          First-run uses this profile to recommend the local model bundle for the machine.
        </p>

        <div className="mt-4 space-y-1">
          <InfoRow label="Platform" value={`${state.system.platform} / ${state.system.arch}`} />
          <InfoRow label="CPU threads" value={String(state.system.cpuCount)} />
          <InfoRow label="Memory" value={`${state.system.totalMemoryGb} GB`} />
          <InfoRow label="Recommended profile" value={`${state.recommendedProfile.label} (${state.recommendedProfile.id})`} />
          <InfoRow label="Default bundle" value={Object.entries(state.recommendedProfile.bundle).map(([k, v]) => `${k}: ${v}`).join(' | ')} mono />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Shared workspace backend</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Shared workspaces should use a separate hosted database so collaboration does not depend on one machine.
        </p>

        <div className="mt-4 space-y-1">
          <InfoRow label="Configured" value={state.workspaceBackend.configured ? 'Yes' : 'No'} />
          <InfoRow label="Provider" value={state.workspaceBackend.provider || 'Not configured'} />
          <InfoRow label="Host" value={state.workspaceBackend.host || 'Hidden until configured'} />
          <InfoRow label="Database" value={state.workspaceBackend.database || 'Hidden until configured'} />
          <InfoRow label="Initialized locally" value={state.workspaceBackend.initialized ? 'Yes' : 'No'} />
          {state.workspaceBackend.initializedAt && <InfoRow label="Initialized at" value={state.workspaceBackend.initializedAt} mono />}
          {state.workspaceBackend.tables?.length > 0 && <InfoRow label="Planned tables" value={state.workspaceBackend.tables.join(', ')} mono />}
        </div>
      </div>
    </div>
  );
}
