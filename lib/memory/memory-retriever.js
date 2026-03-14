import { getMemoryTypes } from './memory-schema.js';
import { buildMemoryContextBlock } from './memory-context-builder.js';
import { getMemoryDocument, readVectors } from './memory-store.js';
import { buildEmbeddingCacheKey, getCachedEmbedding, setCachedEmbedding } from '../embedding-cache/embedding-cache.js';
import { getMemoryRetrievalOptions } from '../user-preferences.js';

const EMBEDDING_MODEL = 'nomic-embed-text-v2-moe';

function getEmbeddingsBaseUrl() {
  return process.env.OPENAI_BASE_URL || 'http://localhost:11434/v1';
}

async function generateEmbedding(text, options = {}) {
  const cacheKey = buildEmbeddingCacheKey({
    text,
    documentId: options.documentId || '',
    namespace: options.namespace || 'query',
    model: EMBEDDING_MODEL,
  });
  const cached = getCachedEmbedding(cacheKey);
  if (cached) {
    return cached;
  }

  const res = await fetch(`${getEmbeddingsBaseUrl()}/embeddings`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.CUSTOM_API_KEY || 'not-needed'}`,
    },
    body: JSON.stringify({
      model: EMBEDDING_MODEL,
      input: text,
    }),
  });

  if (!res.ok) {
    throw new Error(`Embedding request failed: ${res.status}`);
  }

  const data = await res.json();
  const embedding = data?.data?.[0]?.embedding || [];
  if (embedding.length) {
    setCachedEmbedding(cacheKey, embedding, {
      text,
      document_id: options.documentId || '',
      namespace: options.namespace || 'query',
    });
  }
  return embedding;
}

function cosineSimilarity(a = [], b = []) {
  if (!a.length || !b.length || a.length !== b.length) return -1;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (!magA || !magB) return -1;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

async function retrieveRelevantMemory({ task, topK = 5, types = getMemoryTypes(), modelBias = null } = {}) {
  if (!task?.trim()) return [];

  const queryEmbedding = await generateEmbedding(task, { namespace: 'memory-query' });
  const scored = [];

  for (const type of types) {
    for (const vector of readVectors(type)) {
      const doc = getMemoryDocument(type, vector.memory_id);
      if (!doc) continue;
      if (modelBias && doc.model_bias?.length && !doc.model_bias.includes(modelBias)) continue;
      const score = cosineSimilarity(queryEmbedding, vector.embedding);
      if (score <= 0) continue;
      scored.push({ score, doc });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK).map((item) => item.doc);
}

async function buildMemoryContextForTask({ task, topK = 5, types, modelBias, userSettings } = {}) {
  const preferenceOptions = userSettings
    ? getMemoryRetrievalOptions(userSettings, { topK })
    : null;

  if (preferenceOptions && !preferenceOptions.enabled) {
    return {
      documents: [],
      contextBlock: '',
    };
  }

  const docs = await retrieveRelevantMemory({
    task,
    topK: preferenceOptions?.topK || topK,
    types: preferenceOptions?.types?.length ? preferenceOptions.types : types,
    modelBias,
  });
  return {
    documents: docs,
    contextBlock: buildMemoryContextBlock(docs),
  };
}

export { generateEmbedding, retrieveRelevantMemory, buildMemoryContextForTask, EMBEDDING_MODEL };
