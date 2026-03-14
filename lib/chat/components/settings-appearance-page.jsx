'use client';

import { useEffect, useState } from 'react';
import { useTheme } from 'next-themes';
import { getSettingsBundle, saveSettingsSection } from '../actions.js';

export function SettingsAppearancePage() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [state, setState] = useState({
    theme: 'system',
    density: 'comfortable',
    accent: 'emerald',
    terminalTheme: 'dark',
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    getSettingsBundle().then((bundle) => {
      setState(bundle.appearance);
      if (bundle.appearance.theme) {
        setTheme(bundle.appearance.theme);
      }
    }).catch(() => {});
  }, [setTheme]);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettingsSection('appearance', state);
      setTheme(state.theme);
      localStorage.setItem('terminal-theme', state.terminalTheme);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Appearance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Tune the feel of your local workspace without changing how PopeBot behaves.
        </p>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="block">
            <div className="mb-1.5 text-sm font-medium">Theme</div>
            <select value={state.theme} onChange={(e) => setState((prev) => ({ ...prev, theme: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 text-sm font-medium">Density</div>
            <select value={state.density} onChange={(e) => setState((prev) => ({ ...prev, density: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
              <option value="spacious">Spacious</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 text-sm font-medium">Accent color</div>
            <select value={state.accent} onChange={(e) => setState((prev) => ({ ...prev, accent: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="emerald">Emerald</option>
              <option value="blue">Blue</option>
              <option value="amber">Amber</option>
              <option value="rose">Rose</option>
            </select>
          </label>

          <label className="block">
            <div className="mb-1.5 text-sm font-medium">Terminal theme</div>
            <select value={state.terminalTheme} onChange={(e) => setState((prev) => ({ ...prev, terminalTheme: e.target.value }))} className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="dark">Dark</option>
              <option value="light">Light</option>
              <option value="system">System</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save appearance'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
          <span className="text-xs text-muted-foreground">
            Current theme: {mounted ? (theme || state.theme) : state.theme}
          </span>
        </div>
      </div>
    </div>
  );
}
