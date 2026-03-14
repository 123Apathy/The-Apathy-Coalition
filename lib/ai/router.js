import { ChatOpenAI } from '@langchain/openai';

function normalizeAttachmentType(att) {
  if (typeof att === 'string') return att;
  return att?.category || null;
}

function hasImageAttachment(attachments = []) {
  return attachments
    .map(normalizeAttachmentType)
    .some((type) => type === 'image' || type === 'pdf');
}

function looksLikeDocumentImage(text = '') {
  const normalized = text.toLowerCase();
  const hints = [
    'ocr',
    'scan',
    'scanned',
    'document image',
    'screenshot of text',
    'extract text',
    'read text from image',
    'read this receipt',
    'read this form',
    'read this invoice',
  ];
  return hints.some((hint) => normalized.includes(hint));
}

function looksLikeEmbeddingRequest(text = '') {
  const normalized = text.toLowerCase();
  const hints = [
    'embedding',
    'embeddings',
    'vectorize',
    'vectorise',
    'vector search',
    'semantic search',
    'similarity search',
    'rag indexing',
    'create vectors',
  ];
  return hints.some((hint) => normalized.includes(hint));
}

function looksLikeSimpleChat(text = '') {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return false;

  const simpleMessages = new Set([
    'hi',
    'hello',
    'hey',
    'yo',
    'sup',
    'howdy',
    'hiya',
    'good morning',
    'good afternoon',
    'good evening',
    'thanks',
    'thank you',
    'cool',
    'ok',
    'okay',
  ]);

  if (simpleMessages.has(normalized)) return true;

  const words = normalized.split(/\s+/).filter(Boolean);
  if (words.length <= 4 && /^[a-z0-9 ,.!?'’-]+$/.test(normalized)) {
    return true;
  }

  return false;
}

export function analyzeInput(context = {}) {
  const text = context.message || context.text || '';
  const attachments = context.attachments || [];
  const attachmentTypes = attachments.map(normalizeAttachmentType).filter(Boolean);
  const hasImage = hasImageAttachment(attachments);
  const hasPdf = attachmentTypes.includes('pdf');
  const isDocumentImage = hasImage && (
    context.documentImage === true ||
    context.ocr === true ||
    hasPdf ||
    looksLikeDocumentImage(text)
  );
  const isCodeWorkspace = Boolean(
    context.codeWorkspace ||
    context.workspaceId ||
    context.repo ||
    context.branch
  );
  const isEmbeddingRequest = Boolean(context.embeddings) || looksLikeEmbeddingRequest(text);

  let reason = 'default chat fallback';
  if (isDocumentImage) {
    reason = hasPdf ? 'pdf attachment detected' : 'document image or OCR-style request detected';
  } else if (hasImage) {
    reason = 'image attachment detected';
  } else if (isCodeWorkspace) {
    reason = 'code workspace or repo/branch context detected';
  } else if (isEmbeddingRequest) {
    reason = 'embedding-style request detected';
  }

  return {
    attachmentTypes,
    hasAttachments: attachmentTypes.length > 0,
    hasImage,
    hasPdf,
    isDocumentImage,
    isCodeWorkspace,
    isEmbeddingRequest,
    reason,
  };
}

function extractJsonObject(text = '') {
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {}

  const match = trimmed.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}

function mapTaskClassToRole(taskClass) {
  switch (taskClass) {
    case 'REASONING_HARD':
      return 'reasoning';
    case 'CODING':
      return 'coding';
    case 'OCR_DOCS':
      return 'ocr';
    case 'VISION':
      return 'vision';
    case 'EMBEDDINGS':
      return 'embeddings';
    case 'CHAT_GENERAL':
    default:
      return 'chat';
  }
}

function getDeterministicRole(context = {}) {
  if (context.roleHint) {
    return { role: context.roleHint, source: 'hint', reason: `explicit role hint: ${context.roleHint}` };
  }

  const analysis = analyzeInput(context);

  if (analysis.isDocumentImage) {
    return { role: 'ocr', source: 'deterministic', reason: analysis.reason };
  }
  if (analysis.hasImage) {
    return { role: 'vision', source: 'deterministic', reason: analysis.reason };
  }
  if (analysis.isCodeWorkspace) {
    return { role: 'coding', source: 'deterministic', reason: analysis.reason };
  }
  if (analysis.isEmbeddingRequest) {
    return { role: 'embeddings', source: 'deterministic', reason: analysis.reason };
  }

  return null;
}

export async function classifyTaskWithRouter(context = {}) {
  const text = context.message || context.text || '';
  const baseURL = context.baseURL || process.env.OPENAI_BASE_URL;
  const apiKey = process.env.CUSTOM_API_KEY || 'not-needed';

  if (!text.trim() || !baseURL) {
    throw new Error('Router requires plain text input and OPENAI_BASE_URL');
  }

  const model = new ChatOpenAI({
    modelName: 'lfm2.5-thinking',
    maxTokens: 200,
    apiKey,
    configuration: { baseURL },
  });

  const prompt = [
    'You are a task classifier for a local Ollama-based AI system.',
    'Classify the user request only.',
    'Do not answer the request.',
    'Return JSON only with keys: task_class, complexity, confidence.',
    'Allowed task_class values: CHAT_GENERAL, REASONING_HARD, CODING, OCR_DOCS, VISION, EMBEDDINGS.',
    'Allowed complexity values: low, medium, high.',
    'If the request is normal conversation, use CHAT_GENERAL.',
  ].join(' ');

  const response = await model.invoke([
    ['system', prompt],
    ['human', text],
  ]);

  const content =
    typeof response.content === 'string'
      ? response.content
      : response.content
          .filter((block) => block.type === 'text')
          .map((block) => block.text)
          .join('\n');

  const parsed = extractJsonObject(content);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('Router returned invalid JSON');
  }

  const allowedTaskClasses = new Set([
    'CHAT_GENERAL',
    'REASONING_HARD',
    'CODING',
    'OCR_DOCS',
    'VISION',
    'EMBEDDINGS',
  ]);
  const allowedComplexities = new Set(['low', 'medium', 'high']);

  if (!allowedTaskClasses.has(parsed.task_class)) {
    throw new Error('Router returned invalid task_class');
  }
  if (!allowedComplexities.has(parsed.complexity)) {
    throw new Error('Router returned invalid complexity');
  }

  return {
    task_class: parsed.task_class,
    complexity: parsed.complexity,
    confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
  };
}

export async function selectModelRole(context = {}) {
  const deterministic = getDeterministicRole(context);
  if (deterministic) return deterministic;

  const analysis = analyzeInput(context);
  const text = context.message || context.text || '';

  if (looksLikeSimpleChat(text)) {
    return {
      role: 'chat',
      source: 'deterministic',
      reason: 'short conversational input routed directly to chat',
    };
  }

  if (!text.trim() || analysis.hasAttachments) {
    return { role: 'chat', source: 'fallback', reason: 'no deterministic match and router not applicable' };
  }

  try {
    const classification = await classifyTaskWithRouter(context);
    return {
      role: mapTaskClassToRole(classification.task_class),
      source: 'router',
      reason: `router classified ${classification.task_class} (${classification.complexity}, confidence=${classification.confidence})`,
      classification,
    };
  } catch (err) {
    return {
      role: 'chat',
      source: 'fallback',
      reason: `router fallback: ${err.message}`,
    };
  }
}
