import fs from 'fs';
import { embeddingCacheFile, memoryDir } from '../paths.js';

function ensureEmbeddingCache() {
  fs.mkdirSync(memoryDir, { recursive: true });
  if (!fs.existsSync(embeddingCacheFile)) {
    fs.writeFileSync(embeddingCacheFile, '{}\n');
  }
}

function readEmbeddingCache() {
  ensureEmbeddingCache();
  try {
    const parsed = JSON.parse(fs.readFileSync(embeddingCacheFile, 'utf8'));
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function writeEmbeddingCache(cache) {
  ensureEmbeddingCache();
  fs.writeFileSync(embeddingCacheFile, JSON.stringify(cache, null, 2) + '\n');
}

function buildEmbeddingCacheKey({ text = '', documentId = '', namespace = 'default', model = 'nomic-embed-text-v2-moe' } = {}) {
  return `${model}::${namespace}::${documentId || 'query'}::${text}`;
}

function getCachedEmbedding(key) {
  const cache = readEmbeddingCache();
  return cache[key]?.embedding || null;
}

function setCachedEmbedding(key, embedding, meta = {}) {
  const cache = readEmbeddingCache();
  cache[key] = {
    embedding,
    updated_at: Date.now(),
    ...meta,
  };
  writeEmbeddingCache(cache);
  return cache[key];
}

export {
  ensureEmbeddingCache,
  buildEmbeddingCacheKey,
  getCachedEmbedding,
  setCachedEmbedding,
};
