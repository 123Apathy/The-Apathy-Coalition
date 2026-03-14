'use client';

import { useState, useEffect, useCallback } from 'react';
import { ArrowUpCircleIcon, SpinnerIcon, CheckIcon, XIcon, RefreshIcon } from './icons.js';
import { getUpgradeReadiness, getUpgradeWorkflowStatus, triggerUpgrade } from '../actions.js';

function statusClass(status) {
  switch (status) {
    case 'ready':
      return 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400';
    case 'warn':
      return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
    case 'blocked':
      return 'border-red-500/25 bg-red-500/10 text-red-300';
    default:
      return 'border-border bg-muted/30 text-muted-foreground';
  }
}

function modeLabel(mode) {
  switch (mode) {
    case 'local-wsl-runtime':
      return 'Local WSL Runtime';
    case 'managed-linux-runtime':
      return 'Managed Linux Runtime';
    case 'desktop-runtime':
      return 'Desktop Runtime';
    default:
      return 'Unknown Runtime';
  }
}

function workflowTone(run) {
  if (!run) return 'border-border bg-muted/20 text-muted-foreground';
  if (run.status === 'completed' && run.conclusion === 'success') return 'border-emerald-500/25 bg-emerald-500/8 text-emerald-400';
  if (run.status === 'completed' && run.conclusion && run.conclusion !== 'success') return 'border-red-500/25 bg-red-500/10 text-red-300';
  if (run.status === 'in_progress') return 'border-sky-500/25 bg-sky-500/10 text-sky-300';
  if (run.status === 'queued') return 'border-amber-500/25 bg-amber-500/10 text-amber-300';
  return 'border-border bg-muted/20 text-muted-foreground';
}

function workflowLabel(run) {
  if (!run) return 'Waiting for workflow';
  if (run.status === 'completed') {
    return run.conclusion === 'success' ? 'Completed successfully' : `Completed with ${run.conclusion || 'unknown result'}`;
  }
  if (run.status === 'in_progress') return 'Upgrade workflow running';
  if (run.status === 'queued') return 'Upgrade workflow queued';
  return run.status;
}

function formatTime(value) {
  if (!value) return 'n/a';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export function UpgradeDialog({ open, onClose, version, updateAvailable, changelog }) {
  const [upgrading, setUpgrading] = useState(false);
  const [result, setResult] = useState(null);
  const [readiness, setReadiness] = useState(null);
  const [loadingReadiness, setLoadingReadiness] = useState(false);
  const [readinessError, setReadinessError] = useState('');
  const [workflow, setWorkflow] = useState(null);
  const [workflowError, setWorkflowError] = useState('');
  const [pollingWorkflow, setPollingWorkflow] = useState(false);

  const handleClose = useCallback(() => onClose(), [onClose]);

  const loadReadiness = useCallback(async () => {
    setLoadingReadiness(true);
    setReadinessError('');
    try {
      const data = await getUpgradeReadiness();
      setReadiness(data);
    } catch (error) {
      setReadinessError(error?.message || 'Unable to load upgrade preflight.');
    } finally {
      setLoadingReadiness(false);
    }
  }, []);

  const loadWorkflowStatus = useCallback(async () => {
    try {
      const data = await getUpgradeWorkflowStatus();
      setWorkflow(data?.run || null);
      setWorkflowError('');
      return data?.run || null;
    } catch (error) {
      setWorkflowError(error?.message || 'Unable to load workflow status.');
      return null;
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleEsc = (e) => {
      if (e.key === 'Escape') handleClose();
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [open, handleClose]);

  useEffect(() => {
    if (!open) {
      setUpgrading(false);
      setResult(null);
      setReadiness(null);
      setReadinessError('');
      setWorkflow(null);
      setWorkflowError('');
      setPollingWorkflow(false);
      return;
    }
    loadReadiness();
    loadWorkflowStatus();
  }, [open, loadReadiness, loadWorkflowStatus]);

  useEffect(() => {
    if (!open || !pollingWorkflow) return;
    const interval = window.setInterval(async () => {
      const nextRun = await loadWorkflowStatus();
      if (nextRun?.status === 'completed') {
        setPollingWorkflow(false);
      }
    }, 4000);
    return () => window.clearInterval(interval);
  }, [open, pollingWorkflow, loadWorkflowStatus]);

  if (!open) return null;

  const handleUpgrade = async () => {
    setUpgrading(true);
    setResult(null);
    try {
      const response = await triggerUpgrade();
      setResult({ status: 'success', targetVersion: response?.targetVersion || readiness?.updateAvailable || updateAvailable });
      setPollingWorkflow(true);
      window.setTimeout(() => {
        loadWorkflowStatus();
      }, 1200);
    } catch (error) {
      setResult({ status: 'error', message: error?.message || 'Failed to trigger upgrade workflow.' });
    } finally {
      setUpgrading(false);
    }
  };

  const activeVersion = readiness?.version || version;
  const targetVersion = readiness?.updateAvailable || updateAvailable;
  const activeChangelog = readiness?.changelog || changelog;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <div className="fixed inset-0 bg-black/60" onClick={handleClose} />
      <div className="relative z-50 w-full max-w-2xl rounded-2xl border border-border bg-background p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold">Upgrade</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Review the update path before you trigger the workflow.
            </p>
          </div>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground">
            <XIcon size={16} />
          </button>
        </div>

        {result?.status === 'success' ? (
          <div className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/25 bg-emerald-500/8 p-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-500/12">
                <CheckIcon size={20} className="text-emerald-400" />
              </div>
              <div>
                <div className="text-sm font-semibold text-foreground">Upgrade workflow dispatched</div>
                <div className="text-sm text-muted-foreground">
                  Target version: <span className="font-mono text-emerald-400">v{result.targetVersion}</span>
                </div>
              </div>
            </div>

            <div className={`rounded-xl border p-4 ${workflowTone(workflow)}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] opacity-80">Live workflow status</div>
                  <div className="mt-1 text-sm font-medium">{workflowLabel(workflow)}</div>
                </div>
                <button
                  type="button"
                  onClick={loadWorkflowStatus}
                  className="inline-flex items-center gap-2 rounded-md border border-current/20 px-3 py-1.5 text-xs font-medium hover:bg-black/5"
                >
                  <RefreshIcon size={14} />
                  Refresh
                </button>
              </div>
              <div className="mt-3 grid gap-2 text-sm opacity-90 md:grid-cols-2">
                <div>Started: {formatTime(workflow?.createdAt)}</div>
                <div>Updated: {formatTime(workflow?.updatedAt)}</div>
                <div>Status: {workflow?.status || 'n/a'}</div>
                <div>Conclusion: {workflow?.conclusion || 'pending'}</div>
              </div>
              {workflow?.htmlUrl ? (
                <a
                  href={workflow.htmlUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex text-sm font-medium underline underline-offset-4"
                >
                  Open workflow run
                </a>
              ) : null}
              {workflowError ? (
                <div className="mt-3 text-xs text-red-300">{workflowError}</div>
              ) : null}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What happens next</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(readiness?.nextSteps || []).map((step) => (
                    <li key={step}>{step}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Recommended actions</div>
                <div className="mt-3 flex flex-col gap-2">
                  <a href="/runners" className="inline-flex items-center justify-center rounded-md bg-foreground px-4 py-2 text-sm font-medium text-background hover:opacity-90">
                    Open Runners
                  </a>
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
                  >
                    Refresh This View
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-[1fr_1fr]">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Current</div>
                <div className="mt-2 text-lg font-semibold font-mono">v{activeVersion}</div>
              </div>
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/8 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-emerald-300/80">Available</div>
                <div className="mt-2 text-lg font-semibold font-mono text-emerald-400">
                  {targetVersion ? `v${targetVersion}` : 'No update'}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-muted/20 p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Preflight</div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Runtime mode: <span className="text-foreground">{modeLabel(readiness?.runtimeMode)}</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={loadReadiness}
                  disabled={loadingReadiness}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted disabled:opacity-50"
                >
                  <RefreshIcon size={14} />
                  Refresh checks
                </button>
              </div>

              {loadingReadiness ? (
                <div className="mt-4 text-sm text-muted-foreground">Checking upgrade readiness...</div>
              ) : readinessError ? (
                <div className="mt-4 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                  {readinessError}
                </div>
              ) : (
                <div className="mt-4 grid gap-3">
                  {(readiness?.checks || []).map((check) => (
                    <div key={check.id} className={`rounded-lg border p-3 ${statusClass(check.status)}`}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="text-sm font-medium">{check.label}</div>
                        <div className="text-[10px] uppercase tracking-[0.18em]">{check.status}</div>
                      </div>
                      <div className="mt-1 text-sm opacity-90">{check.detail}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What changes</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(readiness?.impact || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">What stays untouched</div>
                <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
                  {(readiness?.preserves || []).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>

            {activeChangelog ? (
              <div className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Release notes</div>
                <div className="mt-3 max-h-48 overflow-y-auto whitespace-pre-wrap text-sm text-muted-foreground">
                  {activeChangelog}
                </div>
              </div>
            ) : null}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleUpgrade}
                disabled={upgrading || loadingReadiness || !readiness?.canTrigger}
                className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-600 disabled:pointer-events-none disabled:opacity-50"
              >
                {upgrading ? (
                  <>
                    <SpinnerIcon size={16} />
                    Triggering upgrade workflow...
                  </>
                ) : result?.status === 'error' ? (
                  <>
                    <RefreshIcon size={16} />
                    Retry upgrade
                  </>
                ) : (
                  <>
                    <ArrowUpCircleIcon size={16} />
                    Start upgrade to v{targetVersion}
                  </>
                )}
              </button>

              {!readiness?.canTrigger && !loadingReadiness ? (
                <p className="text-xs text-amber-300">
                  Upgrade is currently blocked until update metadata and GitHub workflow configuration are both available.
                </p>
              ) : null}

              {result?.status === 'error' ? (
                <p className="text-xs text-red-300">
                  {result.message || 'Failed to trigger the upgrade workflow. Check your GitHub token and workflow permissions.'}
                </p>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
