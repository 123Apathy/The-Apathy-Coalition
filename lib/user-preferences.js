import { MODEL_REGISTRY, getRoleCandidateModels, resolveCompatibleModel } from './ai/model-registry.js';
import { getUserSettingsMap } from './db/user-settings.js';
import { listMemoryDocuments } from './memory/memory-store.js';

const DEFAULT_USER_SETTINGS = {
  personalization: {
    displayName: '',
    role: 'builder',
    tone: 'concise',
    codingStyle: 'safe',
    customInstructions: '',
  },
  memory: {
    enabled: true,
    useArchitecture: true,
    useDecisions: true,
    useFailures: true,
    useExpertLearnings: true,
    autoWriteDreamTeam: true,
    autoWriteSkills: true,
    maxContextDocs: 4,
    stats: {},
  },
  models: {
    chat: MODEL_REGISTRY.chat,
    reasoning: MODEL_REGISTRY.reasoning,
    coding: MODEL_REGISTRY.coding,
    vision: MODEL_REGISTRY.vision,
    embeddings: MODEL_REGISTRY.embeddings,
    router: MODEL_REGISTRY.router,
    routingMode: 'auto',
    availableModels: [
      MODEL_REGISTRY.chat,
      MODEL_REGISTRY.reasoning,
      MODEL_REGISTRY.coding,
      MODEL_REGISTRY.vision,
      MODEL_REGISTRY.ocr,
      MODEL_REGISTRY.embeddings,
      MODEL_REGISTRY.router,
    ],
  },
  notifications: {
    inApp: true,
    jobCompletions: true,
    dreamTeamDecisions: true,
    verificationFailures: true,
    pullRequestUpdates: true,
    playSound: false,
  },
  appearance: {
    theme: 'system',
    density: 'comfortable',
    accent: 'emerald',
    terminalTheme: 'dark',
  },
};

function getMemoryStats() {
  return {
    architecture: listMemoryDocuments('architecture').length,
    decisions: listMemoryDocuments('decisions').length,
    failures: listMemoryDocuments('failures').length,
    'expert-learnings': listMemoryDocuments('expert-learnings').length,
    governance: listMemoryDocuments('governance').length,
    codebase: listMemoryDocuments('codebase').length,
  };
}

function normalizeModelSettings(savedModels = {}) {
  const merged = {
    ...DEFAULT_USER_SETTINGS.models,
    ...(savedModels || {}),
  };

  return {
    ...merged,
    chat: resolveCompatibleModel({
      preferredModel: merged.chat,
      role: 'chat',
      requiresTools: false,
      candidateModels: getRoleCandidateModels('chat'),
    }),
    reasoning: resolveCompatibleModel({
      preferredModel: merged.reasoning,
      role: 'reasoning',
      requiresTools: true,
      candidateModels: getRoleCandidateModels('reasoning'),
    }),
    coding: resolveCompatibleModel({
      preferredModel: merged.coding,
      role: 'coding',
      requiresTools: true,
      candidateModels: getRoleCandidateModels('coding'),
    }),
    vision: resolveCompatibleModel({
      preferredModel: merged.vision,
      role: 'vision',
      requiresTools: false,
      candidateModels: getRoleCandidateModels('vision'),
    }),
    embeddings: resolveCompatibleModel({
      preferredModel: merged.embeddings,
      role: 'embeddings',
      requiresTools: false,
      candidateModels: getRoleCandidateModels('embeddings'),
    }),
    router: resolveCompatibleModel({
      preferredModel: merged.router,
      role: 'router',
      requiresTools: false,
      candidateModels: getRoleCandidateModels('router'),
    }),
  };
}

function buildUserSettingsBundle(userId) {
  const saved = userId ? getUserSettingsMap(userId) : {};
  const normalizedModels = normalizeModelSettings(saved.models || {});
  return {
    personalization: { ...DEFAULT_USER_SETTINGS.personalization, ...(saved.personalization || {}) },
    memory: {
      ...DEFAULT_USER_SETTINGS.memory,
      ...(saved.memory || {}),
      stats: getMemoryStats(),
    },
    models: {
      ...normalizedModels,
      availableModels: [...new Set(DEFAULT_USER_SETTINGS.models.availableModels)],
    },
    notifications: { ...DEFAULT_USER_SETTINGS.notifications, ...(saved.notifications || {}) },
    appearance: { ...DEFAULT_USER_SETTINGS.appearance, ...(saved.appearance || {}) },
  };
}

function buildPersonalizationContext(personalization = {}) {
  const lines = [];
  if (personalization.displayName?.trim()) {
    lines.push(`User name: ${personalization.displayName.trim()}`);
  }
  if (personalization.role?.trim()) {
    lines.push(`User role: ${personalization.role.trim()}`);
  }
  if (personalization.tone?.trim()) {
    lines.push(`Preferred response tone: ${personalization.tone.trim()}`);
  }
  if (personalization.codingStyle?.trim()) {
    lines.push(`Preferred coding style: ${personalization.codingStyle.trim()}`);
  }
  if (personalization.customInstructions?.trim()) {
    lines.push(`Custom instructions: ${personalization.customInstructions.trim()}`);
  }
  return lines.length
    ? `User preferences:\n${lines.map((line) => `- ${line}`).join('\n')}`
    : '';
}

function getMemoryRetrievalOptions(settings = {}, defaults = {}) {
  const memory = settings.memory || DEFAULT_USER_SETTINGS.memory;
  if (!memory.enabled) {
    return { enabled: false, topK: 0, types: [] };
  }

  const types = [];
  if (memory.useArchitecture) {
    types.push('architecture', 'codebase', 'governance');
  }
  if (memory.useDecisions) {
    types.push('decisions', 'experiments');
  }
  if (memory.useFailures) {
    types.push('failures');
  }
  if (memory.useExpertLearnings) {
    types.push('expert-learnings');
  }

  return {
    enabled: true,
    topK: memory.maxContextDocs || defaults.topK || 4,
    types: [...new Set(types)],
  };
}

function classifyNotification(notification) {
  let payload = {};
  try {
    payload = typeof notification.payload === 'string'
      ? JSON.parse(notification.payload)
      : (notification.payload || {});
  } catch {
    payload = {};
  }

  const text = `${notification.notification || ''} ${payload.status || ''} ${payload.merge_result || ''}`.toLowerCase();

  if (text.includes('dreamteam')) return 'dreamTeamDecisions';
  if (text.includes('fail') || text.includes('rollback') || text.includes('error')) return 'verificationFailures';
  if (payload.pr_url || text.includes('pull request') || text.includes('approval')) return 'pullRequestUpdates';
  return 'jobCompletions';
}

function filterNotificationsBySettings(notifications = [], notificationSettings = {}) {
  const prefs = { ...DEFAULT_USER_SETTINGS.notifications, ...(notificationSettings || {}) };
  if (!prefs.inApp) return [];

  return notifications.filter((notification) => {
    const category = classifyNotification(notification);
    return prefs[category] !== false;
  });
}

export {
  DEFAULT_USER_SETTINGS,
  buildUserSettingsBundle,
  buildPersonalizationContext,
  getMemoryRetrievalOptions,
  classifyNotification,
  filterNotificationsBySettings,
};
