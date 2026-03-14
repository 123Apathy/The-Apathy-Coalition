'use client';

import { useEffect, useState } from 'react';
import { saveSettingsSection, getSettingsBundle } from '../actions.js';

function Section({ title, description, children }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="mb-4">
        <h2 className="text-base font-semibold">{title}</h2>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </div>
  );
}

function Label({ title, hint, children }) {
  return (
    <label className="block">
      <div className="mb-1.5">
        <div className="text-sm font-medium">{title}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      {children}
    </label>
  );
}

export function SettingsPersonalizationPage() {
  const [state, setState] = useState({
    displayName: '',
    role: 'builder',
    tone: 'concise',
    codingStyle: 'safe',
    customInstructions: '',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettingsBundle().then((bundle) => {
      setState(bundle.personalization);
    }).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettingsSection('personalization', state);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Section
        title="Personalization"
        description="Teach PopeBot how you like it to behave when planning, writing, and reviewing."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Label title="Display name" hint="Used for a more personal assistant voice.">
            <input
              value={state.displayName}
              onChange={(e) => setState((prev) => ({ ...prev, displayName: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Vande"
            />
          </Label>
          <Label title="Your role" hint="Helps tailor explanations and defaults.">
            <select
              value={state.role}
              onChange={(e) => setState((prev) => ({ ...prev, role: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="builder">Builder</option>
              <option value="operator">Operator</option>
              <option value="reviewer">Reviewer</option>
              <option value="founder">Founder</option>
            </select>
          </Label>
          <Label title="Response tone" hint="How polished or blunt you want the assistant to be.">
            <select
              value={state.tone}
              onChange={(e) => setState((prev) => ({ ...prev, tone: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="concise">Concise</option>
              <option value="balanced">Balanced</option>
              <option value="detailed">Detailed</option>
              <option value="direct">Direct</option>
            </select>
          </Label>
          <Label title="Coding style" hint="Your preferred implementation bias.">
            <select
              value={state.codingStyle}
              onChange={(e) => setState((prev) => ({ ...prev, codingStyle: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              <option value="safe">Safe and maintainable</option>
              <option value="fast">Fast iteration</option>
              <option value="minimal">Minimal changes</option>
              <option value="experimental">Experimental</option>
            </select>
          </Label>
        </div>

        <div className="mt-4">
          <Label
            title="Custom instructions"
            hint="Persistent guidance for how PopeBot should work with you across tasks."
          >
            <textarea
              value={state.customInstructions}
              onChange={(e) => setState((prev) => ({ ...prev, customInstructions: e.target.value }))}
              className="min-h-36 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Prefer small PRs, explain tradeoffs, and bias toward local-first tooling..."
            />
          </Label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save personalization'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </Section>
    </div>
  );
}
