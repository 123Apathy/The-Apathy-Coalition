import { generateEmbedding } from '../memory/memory-retriever.js';
import { readCodeSearchDocuments, readCodeSearchEmbeddings } from './embedding-index-builder.js';
import { buildSearchContextBlock } from './search-context-builder.js';

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

function inferReason(doc, query) {
  const q = String(query || '').toLowerCase();
  if (doc.architecture_summary?.toLowerCase().includes(q)) {
    return 'matches architecture summary';
  }
  if (doc.dependencies?.some((item) => String(item).toLowerCase().includes(q))) {
    return 'matches dependency information';
  }
  return 'semantically related to the query';
}

async function semanticSearchRepository({ query, topK = 5 } = {}) {
  if (!query?.trim()) return [];

  const queryEmbedding = await generateEmbedding(query, { namespace: 'code-search-query' });
  const documents = new Map(readCodeSearchDocuments().map((doc) => [doc.id, doc]));
  const embeddings = readCodeSearchEmbeddings();
  const scored = [];

  for (const entry of embeddings) {
    const doc = documents.get(entry.id);
    if (!doc) continue;
    const relevance = cosineSimilarity(queryEmbedding, entry.embedding);
    if (relevance <= 0) continue;
    scored.push({
      file: doc.file,
      reason: inferReason(doc, query),
      relevance: Number(relevance.toFixed(2)),
      document: doc,
    });
  }

  scored.sort((a, b) => b.relevance - a.relevance || a.file.localeCompare(b.file));
  return scored.slice(0, topK);
}

async function buildRepositorySearchContext({ query, topK = 5 } = {}) {
  const results = await semanticSearchRepository({ query, topK });

  return {
    results,
    contextBlock: buildSearchContextBlock(results),
  };
}

export { semanticSearchRepository, buildRepositorySearchContext };
