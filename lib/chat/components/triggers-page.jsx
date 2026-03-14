'use client';

import { useEffect, useState } from 'react';
import { PlusIcon, SpinnerIcon, TrashIcon, ZapIcon } from './icons.js';
import { getTriggersConfig, saveTriggersConfig } from '../actions.js';

const TYPE_OPTIONS = [
  { value: 'agent', label: 'Agent' },
  { value: 'command', label: 'Command' },
  { value: 'webhook', label: 'Webhook' },
];

const METHOD_OPTIONS = ['POST', 'GET', 'PUT', 'PATCH'];

function makeBlankAction() {
  return {
    type: 'agent',
    job: '',
    command: '',
    url: '',
    method: 'POST',
    varsText: '',
    llm_provider: '',
    llm_model: '',
  };
}

function makeBlankTrigger() {
  return {
    name: '',
    watch_path: '/webhook/example',
    enabled: true,
    actions: [makeBlankAction()],
  };
}

function normalizeAction(action) {
  return {
    type: action.type || 'agent',
    job: action.job || '',
    command: action.command || '',
    url: action.url || '',
    method: action.method || 'POST',
    varsText: action.vars ? JSON.stringify(action.vars, null, 2) : '',
    llm_provider: action.llm_provider || '',
    llm_model: action.llm_model || '',
  };
}

function normalizeTrigger(entry) {
  return {
    name: entry.name || '',
    watch_path: entry.watch_path || '/webhook/example',
    enabled: entry.enabled !== false,
    actions: Array.isArray(entry.actions) && entry.actions.length
      ? entry.actions.map(normalizeAction)
      : [makeBlankAction()],
  };
}

function toPersistedAction(action) {
  const next = { type: action.type };

  if (action.type === 'agent') {
    next.job = action.job.trim();
    if (action.llm_provider.trim()) next.llm_provider = action.llm_provider.trim();
    if (action.llm_model.trim()) next.llm_model = action.llm_model.trim();
  }

  if (action.type === 'command') {
    next.command = action.command.trim();
  }

  if (action.type === 'webhook') {
    next.url = action.url.trim();
    next.method = action.method || 'POST';
    const varsText = action.varsText.trim();
    if (varsText) {
      next.vars = JSON.parse(varsText);
    }
  }

  return next;
}

function toPersistedTrigger(trigger) {
  return {
    name: trigger.name.trim(),
    watch_path: trigger.watch_path.trim(),
    enabled: trigger.enabled !== false,
    actions: trigger.actions.map(toPersistedAction),
  };
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

function ActionEditor({ action, index, onChange, onDelete, onDuplicate, canDelete }) {
  return (
    <div className="rounded-lg border border-border/70 bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-medium">Action {index + 1}</div>
          <div className="text-xs text-muted-foreground">What should happen when this trigger fires.</div>
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
            disabled={!canDelete}
            className="rounded-md border border-destructive/30 px-2.5 py-1.5 text-xs text-destructive hover:bg-destructive/10 disabled:opacity-40"
          >
            <span className="inline-flex items-center gap-1">
              <TrashIcon size={12} />
              Delete
            </span>
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        <Field label="Action Type">
          <select
            value={action.type}
            onChange={(e) => onChange({ ...action, type: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>

        {action.type === 'agent' ? (
          <>
            <Field label="Job Prompt">
              <textarea
                value={action.job}
                onChange={(e) => onChange({ ...action, job: e.target.value })}
                rows={4}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Review the payload and create a task summary."
              />
            </Field>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="LLM Provider">
                <input
                  value={action.llm_provider}
                  onChange={(e) => onChange({ ...action, llm_provider: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="ollama"
                />
              </Field>
              <Field label="LLM Model">
                <input
                  value={action.llm_model}
                  onChange={(e) => onChange({ ...action, llm_model: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="gemma3:12b"
                />
              </Field>
            </div>
          </>
        ) : null}

        {action.type === 'command' ? (
          <Field label="Command">
            <textarea
              value={action.command}
              onChange={(e) => onChange({ ...action, command: e.target.value })}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
              placeholder="node scripts/process-webhook.js"
            />
          </Field>
        ) : null}

        {action.type === 'webhook' ? (
          <>
            <div className="grid gap-4 md:grid-cols-[140px_1fr]">
              <Field label="Method">
                <select
                  value={action.method}
                  onChange={(e) => onChange({ ...action, method: e.target.value })}
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
                  value={action.url}
                  onChange={(e) => onChange({ ...action, url: e.target.value })}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="https://example.com/receiver"
                />
              </Field>
            </div>
            <Field label="JSON Variables" hint="Optional body values for non-GET requests.">
              <textarea
                value={action.varsText}
                onChange={(e) => onChange({ ...action, varsText: e.target.value })}
                rows={5}
                className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
                placeholder='{"event":"task.created"}'
              />
            </Field>
          </>
        ) : null}
      </div>
    </div>
  );
}

function TriggerEditor({ trigger, index, onChange, onDelete, onDuplicate }) {
  const updateAction = (actionIndex, next) => {
    const actions = trigger.actions.map((action, currentIndex) => (currentIndex === actionIndex ? next : action));
    onChange({ ...trigger, actions });
  };

  const addAction = () => {
    onChange({ ...trigger, actions: [...trigger.actions, makeBlankAction()] });
  };

  const duplicateAction = (actionIndex) => {
    const next = [...trigger.actions];
    next.splice(actionIndex + 1, 0, { ...trigger.actions[actionIndex] });
    onChange({ ...trigger, actions: next });
  };

  const deleteAction = (actionIndex) => {
    onChange({
      ...trigger,
      actions: trigger.actions.filter((_, currentIndex) => currentIndex !== actionIndex),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-muted p-2">
            <ZapIcon size={16} />
          </div>
          <div>
            <h3 className="text-base font-semibold">{trigger.name.trim() || `Trigger ${index + 1}`}</h3>
            <p className="text-xs text-muted-foreground">{trigger.watch_path || '/webhook/example'}</p>
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
            value={trigger.name}
            onChange={(e) => onChange({ ...trigger, name: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            placeholder="Inbound task webhook"
          />
        </Field>

        <Field label="Watch Path" hint="Must start with /.">
          <input
            value={trigger.watch_path}
            onChange={(e) => onChange({ ...trigger, watch_path: e.target.value })}
            className="w-full rounded-md border border-input bg-background px-3 py-2 font-mono text-sm"
            placeholder="/webhook/tasks"
          />
        </Field>

        <Field label="Status">
          <label className="flex h-[42px] items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={trigger.enabled !== false}
              onChange={(e) => onChange({ ...trigger, enabled: e.target.checked })}
            />
            Enabled
          </label>
        </Field>
      </div>

      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-medium">Actions</div>
            <div className="text-xs text-muted-foreground">Triggers can fan out into multiple actions.</div>
          </div>
          <button
            type="button"
            onClick={addAction}
            className="rounded-md border border-border px-3 py-2 text-xs hover:bg-muted/60"
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon size={12} />
              Add action
            </span>
          </button>
        </div>

        <div className="space-y-3">
          {trigger.actions.map((action, actionIndex) => (
            <ActionEditor
              key={`${action.type}-${actionIndex}`}
              action={action}
              index={actionIndex}
              onChange={(next) => updateAction(actionIndex, next)}
              onDelete={() => deleteAction(actionIndex)}
              onDuplicate={() => duplicateAction(actionIndex)}
              canDelete={trigger.actions.length > 1}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export function TriggersPage() {
  const [triggers, setTriggers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    getTriggersConfig()
      .then((data) => {
        setTriggers((data || []).map(normalizeTrigger));
      })
      .catch((err) => {
        setError(err?.message || 'Failed to load triggers.');
      })
      .finally(() => setLoading(false));
  }, []);

  const updateTrigger = (index, next) => {
    setTriggers((current) => current.map((entry, entryIndex) => (entryIndex === index ? next : entry)));
  };

  const addTrigger = () => {
    setSuccess('');
    setTriggers((current) => [...current, makeBlankTrigger()]);
  };

  const duplicateTrigger = (index) => {
    setSuccess('');
    setTriggers((current) => {
      const entry = current[index];
      const clone = {
        ...entry,
        name: entry.name ? `${entry.name} Copy` : '',
        actions: entry.actions.map((action) => ({ ...action })),
      };
      const next = [...current];
      next.splice(index + 1, 0, clone);
      return next;
    });
  };

  const deleteTrigger = (index) => {
    setSuccess('');
    setTriggers((current) => current.filter((_, entryIndex) => entryIndex !== index));
  };

  const save = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = triggers.map(toPersistedTrigger);
      const saved = await saveTriggersConfig(payload);
      setTriggers(saved.map(normalizeTrigger));
      setSuccess('Trigger settings saved. Relaunch the app to guarantee the trigger map reloads cleanly.');
    } catch (err) {
      setError(err?.message || 'Failed to save triggers.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-lg font-semibold">Path Triggers</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Add, edit, duplicate, disable, and delete request path automations without editing JSON by hand.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={addTrigger}
            className="rounded-md border border-border px-3 py-2 text-sm hover:bg-muted/60"
          >
            <span className="inline-flex items-center gap-2">
              <PlusIcon size={14} />
              Add trigger
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
            <div key={index} className="h-48 animate-pulse rounded-xl bg-border/50" />
          ))}
        </div>
      ) : triggers.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <div className="rounded-full bg-muted p-4">
            <ZapIcon size={24} />
          </div>
          <p className="mt-4 text-sm font-medium">No triggers configured</p>
          <p className="mt-1 max-w-sm text-xs text-muted-foreground">
            Start with an inbound webhook, path-based automation, or multi-step action flow.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {triggers.map((trigger, index) => (
            <TriggerEditor
              key={`${trigger.name || 'trigger'}-${index}`}
              trigger={trigger}
              index={index}
              onChange={(next) => updateTrigger(index, next)}
              onDelete={() => deleteTrigger(index)}
              onDuplicate={() => duplicateTrigger(index)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
