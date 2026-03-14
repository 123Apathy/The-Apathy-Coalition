import fs from 'fs';
import { codebaseSystemMapFile } from '../paths.js';

function loadSystemMap() {
  if (!fs.existsSync(codebaseSystemMapFile)) {
    return { modules: [] };
  }

  try {
    return JSON.parse(fs.readFileSync(codebaseSystemMapFile, 'utf8'));
  } catch {
    return { modules: [] };
  }
}

function getSubsystems(dependencies = []) {
  const subsystems = new Set();
  for (const dep of dependencies) {
    if (typeof dep !== 'string') continue;
    const parts = dep.split('/');
    if (parts.length >= 2 && parts[0] === 'lib') {
      subsystems.add(`${parts[0]}/${parts[1]}`);
    } else if (parts.length >= 1) {
      subsystems.add(parts[0]);
    }
  }
  return [...subsystems];
}

function detectIssuesForModule(module) {
  const issues = [];
  const dependencyCount = Array.isArray(module.dependencies) ? module.dependencies.length : 0;
  const lineCount = module.line_count || 0;
  const functionCount = module.function_count || 0;
  const importanceScore = module.importance_score || 0;
  const subsystems = getSubsystems(module.dependencies);

  if (lineCount > 400) {
    issues.push({
      module: module.path,
      issue: 'large-module',
      line_count: lineCount,
      importance_score: importanceScore,
      dependency_count: dependencyCount,
    });
  }

  if (dependencyCount >= 10) {
    issues.push({
      module: module.path,
      issue: 'high-dependency-count',
      dependency_count: dependencyCount,
      importance_score: importanceScore,
    });
  }

  if (functionCount >= 15) {
    issues.push({
      module: module.path,
      issue: 'high-function-count',
      function_count: functionCount,
      importance_score: importanceScore,
    });
  }

  if (importanceScore >= 0.75 && lineCount >= 250) {
    issues.push({
      module: module.path,
      issue: 'high-importance-large-module',
      line_count: lineCount,
      importance_score: importanceScore,
      function_count: functionCount,
    });
  }

  if (lineCount >= 250 && functionCount >= 12 && dependencyCount >= 8) {
    issues.push({
      module: module.path,
      issue: 'high-complexity-low-cohesion',
      line_count: lineCount,
      function_count: functionCount,
      dependency_count: dependencyCount,
      importance_score: importanceScore,
    });
  }

  if (subsystems.length >= 4) {
    issues.push({
      module: module.path,
      issue: 'architecture-inconsistency',
      dependency_count: dependencyCount,
      subsystem_count: subsystems.length,
      importance_score: importanceScore,
    });
  }

  return issues;
}

function scanImprovementIssues() {
  const systemMap = loadSystemMap();
  const issues = [];

  for (const module of systemMap.modules || []) {
    issues.push(...detectIssuesForModule(module));
  }

  return {
    scanned_at: Date.now(),
    issues,
  };
}

export { scanImprovementIssues, loadSystemMap };
