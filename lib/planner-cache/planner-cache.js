import fs from 'fs';
import { generateEmbedding } from '../memory/memory-retriever.js';
import { memoryDir, plannerCacheFile } from '../paths.js';

const DEFAULT_SIMILARITY_THRESHOLD = Number(process.env.PLANNER_CACHE_SIMILARITY || 0.92);

function ensurePlannerCache() {
  fs.mkdirSync(memoryDir, { recursive: true });
  if (!fs.existsSync(plannerCacheFile)) {
    fs.writeFileSync(plannerCacheFile, '[]\n');
  }
}

function readPlannerCache() {
  ensurePlannerCache();
  try {
    const parsed = JSON.parse(fs.readFileSync(plannerCacheFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writePlannerCache(entries) {
  ensurePlannerCache();
  fs.writeFileSync(plannerCacheFile, JSON.stringify(entries, null, 2) + '\n');
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

async function findCachedPlannerResult(taskDescription, threshold = DEFAULT_SIMILARITY_THRESHOLD) {
  if (!taskDescription?.trim()) return null;
  const entries = readPlannerCache();
  if (!entries.length) return null;

  const queryEmbedding = await generateEmbedding(taskDescription, { namespace: 'planner-cache-query' });
  const scored = entries
    .map((entry) => ({
      ...entry,
      similarity: cosineSimilarity(queryEmbedding, entry.embedding || []),
    }))
    .filter((entry) => entry.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity || b.score - a.score);

  return scored[0] || null;
}

async function storePlannerResult({ taskDescription, winner }) {
  if (!taskDescription?.trim() || !winner?.proposal) return null;

  const entries = readPlannerCache();
  const embedding = await generateEmbedding(taskDescription, { namespace: 'planner-cache-task' });
  const next = {
    task_description: taskDescription,
    winning_proposal: winner.proposal,
    winning_agent: winner.winning_agent,
    reasoning: winner.reasoning || '',
    expected_changes: winner.expected_changes || [],
    score: winner.score || 0,
    timestamp: Date.now(),
    embedding,
  };

  entries.push(next);
  writePlannerCache(entries.slice(-200));
  return next;
}

export { findCachedPlannerResult, storePlannerResult, DEFAULT_SIMILARITY_THRESHOLD };
