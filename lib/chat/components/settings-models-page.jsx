'use client';

import { useEffect, useState } from 'react';
import { getSettingsBundle, saveSettingsSection } from '../actions.js';

function Field({ label, hint, value, onChange, options }) {
  return (
    <label className="block">
      <div className="mb-1.5 text-sm font-medium">{label}</div>
      {hint && <div className="mb-1.5 text-xs text-muted-foreground">{hint}</div>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
      >
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export function SettingsModelsPage() {
  const [state, setState] = useState({
    chat: '',
    reasoning: '',
    coding: '',
    vision: '',
    embeddings: '',
    router: '',
    routingMode: 'auto',
    availableModels: [],
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettingsBundle().then((bundle) => setState(bundle.models)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettingsSection('models', state);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const options = state.availableModels || [];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Model preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Choose preferred defaults for each model role while keeping the local router intact.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <Field label="Chat model" hint="Default conversational model." value={state.chat} onChange={(value) => setState((prev) => ({ ...prev, chat: value }))} options={options} />
          <Field label="Reasoning model" hint="Used for difficult planning and compression." value={state.reasoning} onChange={(value) => setState((prev) => ({ ...prev, reasoning: value }))} options={options} />
          <Field label="Coding model" hint="Used for code generation and patching." value={state.coding} onChange={(value) => setState((prev) => ({ ...prev, coding: value }))} options={options} />
          <Field label="Vision model" hint="For image and multimodal tasks." value={state.vision} onChange={(value) => setState((prev) => ({ ...prev, vision: value }))} options={options} />
          <Field label="Embeddings model" hint="Used for memory, code search, and skills." value={state.embeddings} onChange={(value) => setState((prev) => ({ ...prev, embeddings: value }))} options={options} />
          <Field label="Router model" hint="Used for route selection and some meta-reasoning." value={state.router} onChange={(value) => setState((prev) => ({ ...prev, router: value }))} options={options} />
        </div>

        <div className="mt-5">
          <label className="block">
            <div className="mb-1.5 text-sm font-medium">Routing mode</div>
            <div className="mb-1.5 text-xs text-muted-foreground">Auto keeps the current router behavior; preferred keeps these choices as a strong user preference.</div>
            <select
              value={state.routingMode}
              onChange={(e) => setState((prev) => ({ ...prev, routingMode: e.target.value }))}
              className="w-full max-w-sm rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="auto">Auto</option>
              <option value="preferred">Preferred defaults</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save model preferences'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </div>
    </div>
  );
}
