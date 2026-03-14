import { getRecentControlTowerEvents } from './event-bus.js';

function buildExecutionVisualization() {
  const events = getRecentControlTowerEvents(200);
  const changeSets = new Map();

  for (const event of events) {
    if (event.type === 'change-set-applied') {
      changeSets.set(event.payload.changeSetId, {
        id: event.payload.changeSetId,
        files: event.payload.files || [],
        impacted: event.payload.impacted || [],
        status: event.payload.status || 'scheduled',
        verification: [],
        updatedAt: event.createdAt,
      });
    }

    if (event.type === 'verification-result') {
      const current = changeSets.get(event.payload.changeSetId) || {
        id: event.payload.changeSetId,
        files: [],
        impacted: [],
        status: 'unknown',
        verification: [],
      };
      current.verification.push({
        results: event.payload.results || [],
        ok: event.payload.ok,
        createdAt: event.createdAt,
      });
      current.status = event.payload.ok ? 'verified' : 'failed';
      current.updatedAt = event.createdAt;
      changeSets.set(current.id, current);
    }
  }

  return {
    changeSets: [...changeSets.values()].sort((a, b) => b.updatedAt - a.updatedAt),
  };
}

export { buildExecutionVisualization };
