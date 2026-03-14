import fs from 'fs';
import path from 'path';
import { getNotifications } from '../db/notifications.js';
import { getDb } from '../db/index.js';
import { codeWorkspaces } from '../db/schema.js';
import { logsDir } from '../paths.js';
import { getRecentControlTowerEvents } from './event-bus.js';

function listRecentLogJobs(limit = 20) {
  if (!fs.existsSync(logsDir)) return [];
  return fs.readdirSync(logsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => {
      const configPath = path.join(logsDir, entry.name, 'job.config.json');
      if (!fs.existsSync(configPath)) return null;
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        return {
          job_id: entry.name,
          title: config.title,
          job: config.job,
          job_type: config.job_type || 'job',
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .slice(-limit)
    .reverse();
}

function buildJobMonitorSnapshot() {
  const events = getRecentControlTowerEvents(120);
  let notifications = [];
  let workspaces = [];
  const skipDbBackedSlices = process.env.CONTROL_TOWER_SKIP_DB !== '0';

  if (!skipDbBackedSlices) {
    try {
      notifications = getNotifications(20, 0).slice(0, 20).map((row) => ({
        ...row,
        payload: (() => {
          try {
            return JSON.parse(row.payload);
          } catch {
            return {};
          }
        })(),
      }));
    } catch (error) {
      console.warn('[control tower] notifications unavailable:', error?.message || error);
    }

    try {
      workspaces = getDb()
        .select()
        .from(codeWorkspaces)
        .all()
        .sort((a, b) => b.updatedAt - a.updatedAt)
        .slice(0, 10);
    } catch (error) {
      console.warn('[control tower] workspaces unavailable:', error?.message || error);
    }
  }

  const recentJobs = listRecentLogJobs();

  const activeTasks = events
    .filter((event) => ['task-created', 'execution-loop-step'].includes(event.type))
    .slice(-20)
    .map((event) => event.payload);

  const sandboxRuns = events
    .filter((event) => ['change-set-applied', 'verification-result'].includes(event.type))
    .slice(-20)
    .map((event) => ({
      type: event.type,
      ...event.payload,
      createdAt: event.createdAt,
    }));

  return {
    activeTasks,
    recentJobs,
    sandboxRuns,
    executionLoops: events.filter((event) => event.type === 'execution-loop-step').slice(-20),
    notifications,
    workspaces,
  };
}

export { buildJobMonitorSnapshot };
