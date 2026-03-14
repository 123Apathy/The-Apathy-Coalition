import fs from 'fs';
import { memoryDir, repoGraphFile } from '../paths.js';

function ensureRepoGraphStore() {
  fs.mkdirSync(memoryDir, { recursive: true });
  if (!fs.existsSync(repoGraphFile)) {
    fs.writeFileSync(repoGraphFile, JSON.stringify({
      generatedAt: Date.now(),
      nodes: [],
      edges: [],
    }, null, 2) + '\n');
  }
}

function writeRepoGraph(graph) {
  ensureRepoGraphStore();
  fs.writeFileSync(repoGraphFile, JSON.stringify(graph, null, 2) + '\n');
  return graph;
}

function readRepoGraph() {
  ensureRepoGraphStore();
  try {
    const parsed = JSON.parse(fs.readFileSync(repoGraphFile, 'utf8'));
    return parsed && typeof parsed === 'object'
      ? parsed
      : { generatedAt: Date.now(), nodes: [], edges: [] };
  } catch {
    return { generatedAt: Date.now(), nodes: [], edges: [] };
  }
}

export { ensureRepoGraphStore, writeRepoGraph, readRepoGraph };
