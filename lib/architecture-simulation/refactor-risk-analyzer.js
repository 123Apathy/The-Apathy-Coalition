import fs from 'fs';
import { codebaseSystemMapFile } from '../paths.js';

function readSystemMap() {
  try {
    return JSON.parse(fs.readFileSync(codebaseSystemMapFile, 'utf8'));
  } catch {
    return { modules: [] };
  }
}

function analyzeRefactorRisk(changeSet, impact = {}, systemMap = readSystemMap()) {
  const moduleMap = new Map((systemMap.modules || []).map((module) => [module.path, module]));
  const touchedModules = [...new Set([...(changeSet.files || []), ...(impact.predicted_impact || [])])]
    .map((path) => moduleMap.get(path))
    .filter(Boolean);

  let score = 0;

  for (const module of touchedModules) {
    if (module.importance_score >= 0.85) score += 3;
    else if (module.importance_score >= 0.65) score += 2;

    if ((module.line_count || 0) >= 400) score += 2;
    if ((module.function_count || 0) >= 12) score += 1;
    if (String(module.path || '').startsWith('lib/ai/') || String(module.path || '').startsWith('lib/dreamteam/')) {
      score += 2;
    }
  }

  if ((impact.predicted_impact || []).length >= 8) score += 3;
  else if ((impact.predicted_impact || []).length >= 4) score += 2;
  else if ((impact.predicted_impact || []).length >= 2) score += 1;

  if ((changeSet.files || []).length >= 4) score += 2;
  else if ((changeSet.files || []).length >= 2) score += 1;

  if (score >= 8) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}

export { analyzeRefactorRisk };
