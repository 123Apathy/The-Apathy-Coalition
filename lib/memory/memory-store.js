import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { memoryDir, memoryEmbeddingsDir } from '../paths.js';
import { getMemoryTypes, memoryVectorSchema, normalizeMemoryDocument } from './memory-schema.js';

function ensureMemoryLayout() {
  fs.mkdirSync(memoryDir, { recursive: true });
  fs.mkdirSync(memoryEmbeddingsDir, { recursive: true });
  for (const type of getMemoryTypes()) {
    fs.mkdirSync(path.join(memoryDir, type), { recursive: true });
    const vectorFile = path.join(memoryEmbeddingsDir, `${type}.json`);
    if (!fs.existsSync(vectorFile)) {
      fs.writeFileSync(vectorFile, '[]\n');
    }
  }
}

function getMemoryDocPath(type, id) {
  return path.join(memoryDir, type, `${id}.json`);
}

function getVectorFilePath(type) {
  return path.join(memoryEmbeddingsDir, `${type}.json`);
}

function listMemoryDocuments(types = getMemoryTypes()) {
  ensureMemoryLayout();
  const resolvedTypes = Array.isArray(types) ? types : [types];
  const docs = [];

  for (const type of resolvedTypes) {
    const dir = path.join(memoryDir, type);
    if (!fs.existsSync(dir)) continue;

    for (const file of fs.readdirSync(dir)) {
      if (!file.endsWith('.json')) continue;
      const fullPath = path.join(dir, file);
      try {
        const parsed = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        docs.push(normalizeMemoryDocument(parsed));
      } catch {}
    }
  }

  return docs;
}

function readVectors(type) {
  ensureMemoryLayout();
  const file = getVectorFilePath(type);
  try {
    const parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(parsed)
      ? parsed.map((item) => memoryVectorSchema.parse(item))
      : [];
  } catch {
    return [];
  }
}

function writeVectors(type, vectors) {
  ensureMemoryLayout();
  fs.writeFileSync(getVectorFilePath(type), JSON.stringify(vectors, null, 2) + '\n');
}

function upsertMemoryDocument(docInput) {
  ensureMemoryLayout();
  const now = Date.now();
  const doc = normalizeMemoryDocument({
    id: docInput.id || randomUUID(),
    created_at: docInput.created_at || now,
    updated_at: now,
    embedding_model: 'nomic-embed-text-v2-moe',
    ...docInput,
  });

  fs.writeFileSync(getMemoryDocPath(doc.type, doc.id), JSON.stringify(doc, null, 2) + '\n');
  return doc;
}

function upsertMemoryVector(type, vectorInput) {
  const vectors = readVectors(type);
  const next = {
    memory_id: vectorInput.memory_id,
    type,
    embedding: vectorInput.embedding,
    updated_at: Date.now(),
  };

  const idx = vectors.findIndex((item) => item.memory_id === next.memory_id);
  if (idx >= 0) {
    vectors[idx] = next;
  } else {
    vectors.push(next);
  }
  writeVectors(type, vectors);
  return next;
}

function getMemoryDocument(type, id) {
  ensureMemoryLayout();
  const file = getMemoryDocPath(type, id);
  if (!fs.existsSync(file)) return null;
  try {
    return normalizeMemoryDocument(JSON.parse(fs.readFileSync(file, 'utf8')));
  } catch {
    return null;
  }
}

export {
  ensureMemoryLayout,
  listMemoryDocuments,
  readVectors,
  writeVectors,
  upsertMemoryDocument,
  upsertMemoryVector,
  getMemoryDocument,
};
