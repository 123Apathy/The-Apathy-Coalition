import fs from 'fs';
import { codebaseSystemMapFile, repoGraphFile } from '../paths.js';

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return fallback;
  }
}

function buildRepositoryHealthSnapshot() {
  const systemMap = readJson(codebaseSystemMapFile, { modules: [], summary: '' });
  const repoGraph = readJson(repoGraphFile, { nodes: [], edges: [] });
  const modules = systemMap.modules || [];
  const technicalDebt = modules.filter((module) =>
    (module.line_count || 0) > 400 ||
    (module.function_count || 0) > 12 ||
    ((module.importance_score || 0) >= 0.75 && (module.line_count || 0) > 250)
  );

  const avgComplexity = modules.length
    ? modules.reduce((sum, module) => sum + (module.line_count || 0) + ((module.function_count || 0) * 12), 0) / modules.length
    : 0;

  const healthScore = Math.max(0, Math.min(100,
    100
    - (technicalDebt.length * 3)
    - Math.round(avgComplexity / 80)
    - Math.round((repoGraph.edges || []).length / 60)
  ));

  return {
    healthScore,
    technicalDebt: technicalDebt.slice(0, 20),
    complexity: {
      moduleCount: modules.length,
      averageComplexity: Number(avgComplexity.toFixed(1)),
      highDebtModuleCount: technicalDebt.length,
      graphEdgeCount: (repoGraph.edges || []).length,
    },
    summary: systemMap.summary || '',
    modules: modules.slice(0, 40),
  };
}

export { buildRepositoryHealthSnapshot };
