import fs from 'fs';
import { randomUUID } from 'crypto';
import { EventEmitter } from 'events';
import { WebSocketServer, WebSocket } from 'ws';
import { controlTowerEventsFile, memoryDir } from '../paths.js';

const MAX_RECENT_EVENTS = 200;

function getState() {
  if (!globalThis.__controlTowerBusState) {
    globalThis.__controlTowerBusState = {
      emitter: new EventEmitter(),
      recent: [],
      recentIds: new Set(),
      tailOffset: 0,
      tailStarted: false,
      websocketAttached: false,
      clients: new Set(),
    };
  }
  return globalThis.__controlTowerBusState;
}

function ensureEventLog() {
  fs.mkdirSync(memoryDir, { recursive: true });
  if (!fs.existsSync(controlTowerEventsFile)) {
    fs.writeFileSync(controlTowerEventsFile, '');
  }
}

function normalizeEvent(type, payload = {}) {
  return {
    id: randomUUID(),
    type,
    payload,
    createdAt: Date.now(),
  };
}

function rememberEvent(event) {
  const state = getState();
  if (state.recentIds.has(event.id)) return false;

  state.recent.push(event);
  state.recentIds.add(event.id);

  while (state.recent.length > MAX_RECENT_EVENTS) {
    const dropped = state.recent.shift();
    if (dropped) state.recentIds.delete(dropped.id);
  }

  state.emitter.emit('event', event);
  for (const client of state.clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'event', event }));
    }
  }
  return true;
}

function parseEventLines(text = '') {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function readRecentControlTowerEvents(limit = 100) {
  ensureEventLog();
  try {
    const content = fs.readFileSync(controlTowerEventsFile, 'utf8');
    return parseEventLines(content).slice(-limit);
  } catch {
    return [];
  }
}

function getRecentControlTowerEvents(limit = 100) {
  const state = getState();
  if (!state.recent.length) {
    for (const event of readRecentControlTowerEvents(limit)) {
      rememberEvent(event);
    }
  }
  return state.recent.slice(-limit);
}

function emitControlTowerEvent(type, payload = {}) {
  ensureEventLog();
  const event = normalizeEvent(type, payload);
  fs.appendFileSync(controlTowerEventsFile, `${JSON.stringify(event)}\n`);
  rememberEvent(event);
  return event;
}

function subscribeControlTowerEvents(listener) {
  const state = getState();
  state.emitter.on('event', listener);
  return () => state.emitter.off('event', listener);
}

function startEventTail() {
  const state = getState();
  ensureEventLog();
  if (state.tailStarted) return;
  state.tailStarted = true;
  state.tailOffset = fs.statSync(controlTowerEventsFile).size;
  for (const event of readRecentControlTowerEvents(MAX_RECENT_EVENTS)) {
    rememberEvent(event);
  }

  const poller = setInterval(() => {
    try {
      const stat = fs.statSync(controlTowerEventsFile);
      if (stat.size < state.tailOffset) {
        state.tailOffset = 0;
      }
      if (stat.size === state.tailOffset) return;

      const stream = fs.createReadStream(controlTowerEventsFile, {
        encoding: 'utf8',
        start: state.tailOffset,
        end: stat.size - 1,
      });

      let chunk = '';
      stream.on('data', (data) => {
        chunk += data;
      });
      stream.on('end', () => {
        state.tailOffset = stat.size;
        for (const event of parseEventLines(chunk)) {
          rememberEvent(event);
        }
      });
    } catch {}
  }, 1000);

  if (poller.unref) poller.unref();
}

function attachControlTowerWebSocket(server, wsPath = '/control-tower/ws') {
  const state = getState();
  if (state.websocketAttached) return;
  state.websocketAttached = true;
  startEventTail();

  const wss = new WebSocketServer({ noServer: true, perMessageDeflate: false });
  wss.on('connection', (ws) => {
    state.clients.add(ws);
    ws.send(JSON.stringify({
      type: 'hello',
      events: getRecentControlTowerEvents(40),
    }));
    ws.on('close', () => {
      state.clients.delete(ws);
    });
  });

  server.on('upgrade', (req, socket, head) => {
    const url = new URL(req.url, 'http://localhost');
    if (url.pathname !== wsPath) return;
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  });
}

export {
  emitControlTowerEvent,
  getRecentControlTowerEvents,
  readRecentControlTowerEvents,
  subscribeControlTowerEvents,
  attachControlTowerWebSocket,
};
