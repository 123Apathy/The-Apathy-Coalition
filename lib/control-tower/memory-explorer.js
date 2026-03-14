import { listMemoryDocuments } from '../memory/memory-store.js';
import { getMemoryTypes } from '../memory/memory-schema.js';
import { listSkills } from '../skills/skill-registry.js';

function buildMemoryExplorerSnapshot() {
  const grouped = {};
  for (const type of getMemoryTypes()) {
    grouped[type] = listMemoryDocuments(type)
      .sort((a, b) => b.updated_at - a.updated_at)
      .slice(0, 25);
  }

  return {
    memory: grouped,
    skills: listSkills().slice(0, 25),
  };
}

export { buildMemoryExplorerSnapshot };
