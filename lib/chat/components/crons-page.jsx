'use client';

import { useEffect, useState } from 'react';
import { ClockIcon, PlusIcon, SpinnerIcon, TrashIcon } from './icons.js';
import { getCronsConfig, saveCronsConfig } from '../actions.js';

const TYPE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'command', label: 'Command' },
  { value: 'webhook', label: 'Webhook' },
];

const METHOD_OPTIONS = ['POST', 'GET', 'PUT', 'PATCH'];

function describeCron(schedule) {
  const parts = schedule.trim().split(/\s+/);
  if (parts.length !== 5) return 'Use a standard 5-part cron expression';

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute.startsWith('*/') && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${minute.slice(2)} minutes`;
  }

  if (hour.startsWith('*/') && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every ${hour.slice(2)} hours`;
  }

  if (minute !== '*' && hour !== '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Daily at ${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;
  }

  return 'Custom schedule';
}

function makeBlankCron() {
  return {
    name: '',
    schedule: '0 * * * *',
    type: 'agent',
    enabled: true,
    job: '',
    command: '',
    url: '',
    method: 'POST',
    varsText: '',
    llm_provider: '',
    llm_model: '',
  };
}

function normalizeForEditor(entry) {
  return {
    name: entry.name || '',
    schedule: entry.schedule || '0 * * * *',
    type: entry.type || 'agent',
    enabled: entry.enabled !== false,
    job: entry.job || '',
    command: entry.command || '',
    url: entry.url || '',
    method: entry.method || 'POST',
    varsText: entry.vars ? JSON.stringify(entry.vars, null, 2) : '',
    llm_provider: entry.llm_provider || '',
    llm_model: entry.llm_model || '',
  };
}

function toPersistedCron(entry) {
  const next = {
    name: entry.name.trim(),
    schedule: entry.schedule.trim(),
    type: entry.type,
    enabled: entry.enabled !== false,
  };

  if (entry.type === 'agent') {
    next.job = entry.job.trim();
    if (entry.llm_provider.trim()) next.llm_provider = entry.llm_provider.trim();
    if (entry.llm_model.trim()) next.llm_model = entry.llm_model.trim();
  }

  if (entry.type === 'command') {
    next.command = entry.command.trim();
  }

  if (entry.type === 'webhook') {
    next.url = entry.url.trim();
    next.method = entry.method || 'POST';
    const varsText = entry.varsText.trim();
    if (varsText) {
      next.vars = JSON.parse(varsText);
    }
  }

  return next;
}

function Field({ label, children, hint }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
      {children}
      {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
    </label>
  );
}

function CronEditor({ cron, index, onChange, onDelete, onDuplicate }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-md bg-muted p-2">
              <ClockIcon size={16} />
            </div>
            <div>
              <h3 className="text-base font-semibold">{cron.name.trim() || `Cron ${index + 1}`}</h3>
              <p className="text-xs text-muted-foreground">{describeCron(cron.schedule)}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onDuplicate}
            className="rounded-md border border-border px-2.5 py-1.5 text-xs hover:bg-muted/60"
          >
            Duplicate
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10"
          >
            <span className="inline-flex items-center gap-1">
              <TrashIcon size={12} />
              Delete
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <Field label="Name">
          <input
            value={cron.name}
            onChange={(e) => onChange({ ...cron, name: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Daily briefing"
          />
        </Field>

        <Field label="Schedule" hint="Example: 0 9 * * 1-5">
          <input
            value={cron.schedule}
            onChange={(e) => onChange({ ...cron, schedule: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            placeholder="0 * * * *"
          />
        </Field>

        <Field label="Type">
          <select
            value={cron.type}
            onChange={(e) => onChange({ ...cron, type: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <label className="flex h-[42px] items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={cron.enabled !== false}
              onChange={(e) => onChange({ ...cron, enabled: e.target.checked })}
            />
            Enabled
          </label>
        </Field>
      </div>

      {cron.type === 'agent' ? (
        <div className="mt-4 grid gap-4">
          <Field label="Job Prompt">
            <textarea
              value={cron.job}
              onChange={(e) => onChange({ ...cron, job: e.target.value })}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Summarize repo activity and send me a morning report."
            />
          </Field>

          <div className="grid gap-4 md:grid-cols-2">
            <Field label="LLM Provider">
              <input
                value={cron.llm_provider}
                onChange={(e) => onChange({ ...cron, llm_provider: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="ollama"
              />
            </Field>
            <Field label="LLM Model">
              <input
                value={cron.llm_model}
                onChange={(e) => onChange({ ...cron, llm_model: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="qwen2.5-coder:7b"
              />
            </Field>
          </div>
        </div>
      ) : null}

      {cron.type === 'command' ? (
        <div className="mt-4">
          <Field label="Command" hint="Runs inside the cron working directory.">
            <textarea
              value={cron.command}
              onChange={(e) => onChange({ ...cron, command: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              placeholder="node scripts/daily-report.js"
            />
          </Field>
        </div>
      ) : null}

      {cron.type === 'webhook' ? (
        <div className="mt-4 grid gap-4">
          <div className="grid gap-4 md:grid-cols-[140px_1fr]">
            <Field label="Method">
              <select
                value={cron.method}
                onChange={(e) => onChange({ ...cron, method: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {METHOD_OPTIONS.map((method) => (
                  <option key={method} value={method}>
                    {method}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="URL">
              <input
                value={cron.url}
                onChange={(e) => onChange({ ...cron, url: e.target.value })}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="https://example.com/webhook"
              />
            </Field>
          </div>
          <Field label="JSON Variables" hint="Optional JSON body fields for non-GET webhooks.">
            <textarea
              value={cron.varsText}
              onChange={(e) => onChange({ ...cron, varsText: e.target.value })}
              rows={5}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              placeholder='{"source":"apathy"}'
            />
          </Field>
        </div>
      ) : null}
    </div>
  );
}

export function CronsPage() {
  const [crons, setCrons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getCronsConfig()
      .then((data) => {
        setCrons((data || []).map(normalizeForEditor));
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load cron jobs.');
      })
      .finally(() => setLoading(false));
  }, []);

  const updateCron = (index, next) => {
    setCrons((current) => current.map((entry, entryIndex) => (entryIndex === index ? next : entry)));
  };

  const addCron = () => {
    setSuccess('');
    setCrons((current) => [...current, makeBlankCron()]);
  };

  const duplicateCron = (index) => {
    setSuccess('');
    setCrons((current) => {
      const entry = current[index];
      const clone = {
        ...entry,
        name: entry.name ? `${entry.name} Copy` : '',
      };
      const next = [...current];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

  const deleteCron = (index) => {
    setSuccess('');
    setCrons((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = crons.map(toPersistedCron);
      const saved = await saveCronsConfig(payload);
      setCrons(saved.map(normalizeForEditor));
      setSuccess('Cron settings saved. Relaunch the app to guarantee schedules reload cleanly.');
    } catch (err) {
      setError(err?.message || 'Failed to save cron settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Scheduled Jobs</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add, edit, duplicate, disable, and delete cron jobs without hand-editing JSON.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addCron}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60"
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon size={14} />
              Add cron
            </span>
          </button>
          <button
            type="button"
            onClick={save}
            disabled={saving || loading}
            className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-60"
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <SpinnerIcon size={14} />
                Saving
              </span>
            ) : 'Save changes'}
          </button>
        </div>
      </div>

      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">{error}</div> : null}
      {success ? <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700">{success}</div> : null}

      {loading ? (
        <div className="flex flex-col gap-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-40 animate-pulse rounded-xl bg-border/50" />
          ))}
        </div>
      ) : crons.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <ClockIcon size={24} />
          </div>
          <p className="mt-4 text-sm font-medium">No cron jobs configured</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Start with a scheduled report, repo sync, automation task, or webhook ping.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {crons.map((cron, index) => (
            <CronEditor
              key={`${cron.name || 'cron'}-${index}`}
              cron={cron}
              index={index}
              onChange={(next) => updateCron(index, next)}
              onDelete={() => deleteCron(index)}
              onDuplicate={() => duplicateCron(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
