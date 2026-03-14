'use client';

import { useEffect, useState } from 'react';
import { getSettingsBundle, saveSettingsSection } from '../actions.js';

const OPTIONS = [
  ['inApp', 'In-app notifications', 'Show notifications in the bell popover and notifications page.'],
  ['jobCompletions', 'Job completions', 'Notify when autonomous jobs or runs finish.'],
  ['dreamTeamDecisions', 'DreamTeam decisions', 'Notify when a proposal is approved, rejected, or escalated.'],
  ['verificationFailures', 'Verification failures', 'Highlight failing change sets, tests, or rollback events.'],
  ['pullRequestUpdates', 'Pull request updates', 'Notify when approvals or PR state changes appear.'],
  ['playSound', 'Sound feedback', 'Play a lightweight audio cue when important events arrive.'],
];

export function SettingsNotificationsPage() {
  const [state, setState] = useState({
    inApp: true,
    jobCompletions: true,
    dreamTeamDecisions: true,
    verificationFailures: true,
    pullRequestUpdates: true,
    playSound: false,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    getSettingsBundle().then((bundle) => setState(bundle.notifications)).catch(() => {});
  }, []);

  const save = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await saveSettingsSection('notifications', state);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Notification preferences</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Decide which events should surface in your personal workspace.
        </p>

        <div className="mt-4 grid gap-3">
          {OPTIONS.map(([key, label, hint]) => (
            <label key={key} className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
              <div>
                <div className="text-sm font-medium">{label}</div>
                <div className="mt-1 text-xs text-muted-foreground">{hint}</div>
              </div>
              <input
                type="checkbox"
                checked={!!state[key]}
                onChange={(e) => setState((prev) => ({ ...prev, [key]: e.target.checked }))}
                className="mt-1 h-4 w-4"
              />
            </label>
          ))}
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={save}
            disabled={saving}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save notification settings'}
          </button>
          {saved && <span className="text-sm text-emerald-600">Saved</span>}
        </div>
      </div>
    </div>
  );
}
