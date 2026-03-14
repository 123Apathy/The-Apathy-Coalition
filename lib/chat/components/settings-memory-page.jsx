'use client';

import { useEffect, useState } from 'react';
import { getSettingsBundle, saveSettingsSection } from '../actions.js';

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors ${checked ? 'bg-primary' : 'bg-muted-foreground/30'}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${checked ? 'translate-x-5' : 'translate-x-0.5'}`} />
      </button>
    </label>
  );
}

export function SettingsMemoryPage() {
  const [state, setState] = useState({
    enabled: true,
    useArchitecture: true,
    useDecisions: true,
    useFailures: true,
    useExpertLearnings: true,
    autoWriteDreamTeam: true,
    autoWriteSkills: true,
    maxContextDocs: 4,
    stats: {},
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettingsBundle().then((bundle) => setState(bundle.memory)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettingsSection('memory', state);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Memory controls</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Control how much long-term memory PopeBot uses and what it writes back after planning and execution.
        </p>

        <div className="mt-4 grid gap-4">
          <Toggle checked={state.enabled} onChange={(value) => setState((prev) => ({ ...prev, enabled: value }))} label="Enable long-term memory" hint="Use stored repository and governance memory during planning." />
          <Toggle checked={state.autoWriteDreamTeam} onChange={(value) => setState((prev) => ({ ...prev, autoWriteDreamTeam: value }))} label="Write DreamTeam learnings" hint="Store governance lessons, decisions, and architecture updates after review." />
          <Toggle checked={state.autoWriteSkills} onChange={(value) => setState((prev) => ({ ...prev, autoWriteSkills: value }))} label="Learn reusable skills from successful work" hint="Promote repeatable engineering patterns into the skills system." />
        </div>

        <div className="mt-5">
          <div className="mb-2 text-sm font-medium">Preferred memory sources</div>
          <div className="grid gap-3 md:grid-cols-2">
            {[
              ['useArchitecture', 'Architecture memory'],
              ['useDecisions', 'Decision records'],
              ['useFailures', 'Failure memory'],
              ['useExpertLearnings', 'Expert learnings'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm">
                <input
                  type="checkbox"
                  checked={!!state[key]}
                  onChange={(e) => setState((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1.5 text-sm font-medium">Max memory docs in context</div>
            <input
              type="number"
              min="1"
              max="12"
              value={state.maxContextDocs}
              onChange={(e) => setState((prev) => ({ ...prev, maxContextDocs: Number(e.target.value || 4) }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </label>
          <div className="rounded-md border border-border bg-muted/30 px-4 py-3">
            <div className="mb-2 text-sm font-medium">Stored memory snapshot</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
              {Object.entries(state.stats || {}).map(([type, count]) => (
                <div key={type} className="flex items-center justify-between gap-3">
                  <span>{type}</span>
                  <span className="font-mono text-foreground">{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save memory settings'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </div>
    </div>
  );
}
