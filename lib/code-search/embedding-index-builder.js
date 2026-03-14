import fs from 'fs';
import { generateEmbedding } from '../memory/memory-retriever.js';
import { codeSearchDir, codeSearchEmbeddingsFile, codeSearchIndexFile } from '../paths.js';
import { buildRepoSearchDocuments } from './repo-indexer.js';

function ensureCodeSearchLayout() {
  fs.mkdirSync(codeSearchDir, { recursive: true });
  if (!fs.existsSync(codeSearchIndexFile)) {
    fs.writeFileSync(codeSearchIndexFile, '[]\n');
  }
  if (!fs.existsSync(codeSearchEmbeddingsFile)) {
    fs.writeFileSync(codeSearchEmbeddingsFile, '[]\n');
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function readJson(file, fallback = []) {
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed) ? parsed : fallback;
  } catch {
    return fallback;
  }
}

async function buildCodeSearchIndex(fileMap) {
  ensureCodeSearchLayout();
  const documents = buildRepoSearchDocuments(fileMap);
  const embeddings = [];

  for (const doc of documents) {
    try {
      embeddings.push({
        id: doc.id,
        file: doc.file,
        embedding: await generateEmbedding(doc.content, {
          namespace: 'code-search-document',
          documentId: doc.id,
        }),
        updated_at: Date.now(),
      });
    } catch (err) {
      console.warn(`[code search] embedding failed for ${doc.file}:`, err.message);
    }
  }

  writeJson(codeSearchIndexFile, documents);
  writeJson(codeSearchEmbeddingsFile, embeddings);

  return {
    documents,
    embeddings,
  };
}

function readCodeSearchDocuments() {
  ensureCodeSearchLayout();
  return readJson(codeSearchIndexFile, []);
}

function readCodeSearchEmbeddings() {
  ensureCodeSearchLayout();
  return readJson(codeSearchEmbeddingsFile, []);
}

export {
  ensureCodeSearchLayout,
  buildCodeSearchIndex,
  readCodeSearchDocuments,
  readCodeSearchEmbeddings,
};
