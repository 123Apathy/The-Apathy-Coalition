import fs from 'fs';
import path from 'path';
import { randomUUID } from 'crypto';
import { memorySkillsDir, memorySkillsEmbeddingsFile } from '../paths.js';

function ensureSkillLayout() {
  fs.mkdirSync(memorySkillsDir, { recursive: true });
  if (!fs.existsSync(memorySkillsEmbeddingsFile)) {
    fs.writeFileSync(memorySkillsEmbeddingsFile, '[]\n');
  }
}

function normalizeSkill(skill) {
  const now = Date.now();
  return {
    id: skill.id || randomUUID(),
    name: skill.name || 'unnamed-skill',
    description: skill.description || '',
    trigger_conditions: Array.isArray(skill.trigger_conditions) ? skill.trigger_conditions : [],
    recommended_steps: Array.isArray(skill.recommended_steps) ? skill.recommended_steps : [],
    confidence_score: typeof skill.confidence_score === 'number' ? skill.confidence_score : 0.5,
    source: skill.source || { kind: 'system' },
    created_at: skill.created_at || now,
    updated_at: now,
  };
}

function getSkillPath(id) {
  return path.join(memorySkillsDir, `${id}.json`);
}

function listSkills() {
  ensureSkillLayout();
  return fs.readdirSync(memorySkillsDir)
    .filter((file) => file.endsWith('.json') && file !== 'embeddings.json')
    .map((file) => {
      try {
        return normalizeSkill(JSON.parse(fs.readFileSync(path.join(memorySkillsDir, file), 'utf8')));
      } catch {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => b.updated_at - a.updated_at || a.name.localeCompare(b.name));
}

function upsertSkill(skillInput) {
  ensureSkillLayout();
  const skill = normalizeSkill(skillInput);
  fs.writeFileSync(getSkillPath(skill.id), JSON.stringify(skill, null, 2) + '\n');
  return skill;
}

function readSkillEmbeddings() {
  ensureSkillLayout();
  try {
    const parsed = JSON.parse(fs.readFileSync(memorySkillsEmbeddingsFile, 'utf8'));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeSkillEmbeddings(items) {
  ensureSkillLayout();
  fs.writeFileSync(memorySkillsEmbeddingsFile, JSON.stringify(items, null, 2) + '\n');
}

function upsertSkillEmbedding(item) {
  const items = readSkillEmbeddings();
  const next = {
    skill_id: item.skill_id,
    embedding: item.embedding,
    updated_at: Date.now(),
  };
  const index = items.findIndex((entry) => entry.skill_id === next.skill_id);
  if (index >= 0) items[index] = next;
  else items.push(next);
  writeSkillEmbeddings(items);
  return next;
}

export {
  ensureSkillLayout,
  listSkills,
  upsertSkill,
  readSkillEmbeddings,
  upsertSkillEmbedding,
};
