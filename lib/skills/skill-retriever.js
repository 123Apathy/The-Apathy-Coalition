import { generateEmbedding } from '../memory/memory-retriever.js';
import { listSkills, readSkillEmbeddings } from './skill-registry.js';

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

async function retrieveRelevantSkills({ taskDescription, topK = 3 } = {}) {
  if (!taskDescription?.trim()) return [];

  const queryEmbedding = await generateEmbedding(taskDescription, { namespace: 'skill-query' });
  const skills = new Map(listSkills().map((skill) => [skill.id, skill]));
  const scored = [];

  for (const item of readSkillEmbeddings()) {
    const skill = skills.get(item.skill_id);
    if (!skill) continue;
    const relevance = cosineSimilarity(queryEmbedding, item.embedding);
    if (relevance <= 0) continue;
    scored.push({
      ...skill,
      relevance: Number(relevance.toFixed(2)),
    });
  }

  scored.sort((a, b) => b.relevance - a.relevance || b.confidence_score - a.confidence_score);
  return scored.slice(0, topK);
}

export { retrieveRelevantSkills };
