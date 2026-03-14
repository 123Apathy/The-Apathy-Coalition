import { getRecentControlTowerEvents } from './event-bus.js';
import { buildJobMonitorSnapshot } from './job-monitor.js';
import { buildExecutionVisualization } from './execution-visualizer.js';
import { buildRepositoryHealthSnapshot } from './repo-health-service.js';
import { buildMemoryExplorerSnapshot } from './memory-explorer.js';
import { buildOrganizationSnapshot } from './organization-dashboard.js';

function getControlTowerSnapshot() {
  let jobs = {
    activeTasks: [],
    recentJobs: [],
    sandboxRuns: [],
    executionLoops: [],
    notifications: [],
    workspaces: [],
  };

  try {
    jobs = buildJobMonitorSnapshot();
  } catch (error) {
    console.warn('[control tower] job monitor unavailable:', error?.message || error);
  }

  return {
    generatedAt: Date.now(),
    events: getRecentControlTowerEvents(60),
    jobs,
    execution: buildExecutionVisualization(),
    repository: buildRepositoryHealthSnapshot(),
    memory: buildMemoryExplorerSnapshot(),
    organization: buildOrganizationSnapshot(),
  };
}

export { getControlTowerSnapshot };
