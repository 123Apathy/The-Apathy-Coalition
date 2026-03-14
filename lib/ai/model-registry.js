export const MODEL_REGISTRY = {
  chat: 'gemma3:12b',
  reasoning: 'deepseek-r1:14b',
  coding: 'qwen2.5-coder:7b',
  vision: 'qwen2.5vl',
  ocr: 'deepseek-ocr',
  embeddings: 'nomic-embed-text-v2-moe',
  router: 'lfm2.5-thinking',
};

export const MODEL_CAPABILITIES = {
  'gemma3:12b': { chat: true, tools: false, vision: false, ocr: false, embeddings: false, router: false },
  'deepseek-r1:14b': { chat: true, reasoning: true, coding: true, tools: true, vision: false, ocr: false, embeddings: false, router: true },
  'qwen2.5-coder:7b': { chat: true, coding: true, tools: true, vision: false, ocr: false, embeddings: false, router: false },
  'qwen2.5vl': { chat: true, vision: true, tools: false, ocr: false, embeddings: false, router: false },
  'deepseek-ocr': { ocr: true, vision: true, tools: false, chat: false, embeddings: false, router: false },
  'nomic-embed-text-v2-moe': { embeddings: true, tools: false, chat: false, vision: false, ocr: false, router: false },
  'lfm2.5-thinking': { router: true, reasoning: true, tools: false, chat: false, vision: false, ocr: false, embeddings: false },
};

export function modelSupportsTools(modelName) {
  if (!modelName) return false;
  return MODEL_CAPABILITIES[modelName]?.tools === true;
}

export function getRoleRequirements(role = 'chat', { requiresTools = false } = {}) {
  const requirements = { tools: requiresTools };

  switch (role) {
    case 'reasoning':
      requirements.reasoning = true;
      requirements.chat = true;
      break;
    case 'coding':
      requirements.coding = true;
      requirements.chat = true;
      break;
    case 'vision':
      requirements.vision = true;
      break;
    case 'ocr':
      requirements.ocr = true;
      break;
    case 'embeddings':
      requirements.embeddings = true;
      break;
    case 'router':
      requirements.router = true;
      break;
    case 'chat':
    default:
      requirements.chat = true;
      break;
  }

  return requirements;
}

export function modelSatisfiesRequirements(modelName, requirements = {}) {
  if (!modelName) return false;
  const capabilities = MODEL_CAPABILITIES[modelName] || {};
  return Object.entries(requirements).every(([capability, required]) => {
    if (!required) return true;
    return capabilities[capability] === true;
  });
}

export function getRoleCandidateModels(role = 'chat') {
  const preferred = MODEL_REGISTRY[role];
  const candidatesByRole = {
    chat: [preferred, MODEL_REGISTRY.coding, MODEL_REGISTRY.reasoning],
    reasoning: [preferred, MODEL_REGISTRY.coding, MODEL_REGISTRY.chat],
    coding: [preferred, MODEL_REGISTRY.reasoning, MODEL_REGISTRY.chat],
    vision: [preferred, MODEL_REGISTRY.ocr],
    ocr: [preferred, MODEL_REGISTRY.vision],
    embeddings: [preferred],
    router: [preferred, MODEL_REGISTRY.reasoning],
  };

  return [...new Set((candidatesByRole[role] || [preferred]).filter(Boolean))];
}

export function resolveCompatibleModel({
  preferredModel,
  role = 'chat',
  requiresTools = false,
  candidateModels = [],
} = {}) {
  const requirements = getRoleRequirements(role, { requiresTools });
  if (modelSatisfiesRequirements(preferredModel, requirements)) {
    return preferredModel;
  }

  const candidates = [
    ...candidateModels,
    ...getRoleCandidateModels(role),
  ].filter(Boolean);

  return candidates.find((candidate) => modelSatisfiesRequirements(candidate, requirements)) || preferredModel;
}

export function getToolCompatibleModel(preferredModel, role = 'chat') {
  return resolveCompatibleModel({ preferredModel, role, requiresTools: true });
}
