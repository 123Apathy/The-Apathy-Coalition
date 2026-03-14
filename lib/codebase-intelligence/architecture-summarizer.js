import fs from 'fs';
import path from 'path';
import { z } from 'zod';
import { PROJECT_ROOT } from '../paths.js';
import { createModel } from '../ai/model.js';
import { MODEL_REGISTRY } from '../ai/model-registry.js';

const IMPORTANT_PREFIXES = [
  'lib/ai/',
  'lib/dreamteam/',
  'lib/memory/',
  'lib/codebase-intelligence/',
  'lib/autodev/',
];

function inferResponsibility(file) {
  const p = file.path.toLowerCase();
  if (p.includes('lib/ai/model')) return 'routes and creates language model clients';
  if (p.includes('lib/ai/agent')) return 'constructs LangGraph agents and tool sets';
  if (p.includes('lib/chat')) return 'handles interactive chat transport and UI integration';
  if (p.includes('lib/dreamteam')) return 'runs staged governance reviews before execution';
  if (p.includes('lib/memory')) return 'stores and retrieves model-independent long-term memory';
  if (p.includes('lib/codebase-intelligence')) return 'analyzes repository structure and architecture';
  if (p.includes('api/index')) return 'serves API routes and webhook handlers';
  if (p.includes('lib/tools')) return 'provides orchestration helpers for jobs, docker, and providers';
  if (p.includes('config/')) return 'defines prompts and runtime configuration';
  if (p.includes('templates/')) return 'scaffolds user projects and deployment assets';
  return 'supports repository functionality';
}

function getModuleDependencies(filePath, dependencyMap) {
  return dependencyMap.dependencies
    .find((item) => item.source === filePath)
    ?.imports?.map((item) => item.target) || [];
}

function isImportantModule(filePath) {
  return IMPORTANT_PREFIXES.some((prefix) => filePath.startsWith(prefix));
}

function buildDeterministicModules(fileMap, dependencyMap) {
  const importCounts = new Map();
  const dependencyCounts = new Map();

  for (const entry of dependencyMap.dependencies) {
    dependencyCounts.set(entry.source, entry.imports.length);
    for (const imp of entry.imports) {
      const target = imp.target;
      if (!target || imp.type !== 'internal') continue;
      importCounts.set(target, (importCounts.get(target) || 0) + 1);
    }
  }

  const maxImportedBy = Math.max(1, ...importCounts.values(), 1);
  const maxDependencyCount = Math.max(1, ...dependencyCounts.values(), 1);

  return fileMap.files
    .filter((file) => file.path.startsWith('lib/') || file.path.startsWith('api/') || file.path.startsWith('config/'))
    .filter((file) => !file.path.endsWith('CLAUDE.md'))
    .slice(0, 200)
    .map((file) => {
      const dependencies = getModuleDependencies(file.path, dependencyMap).slice(0, 12);
      const importedBy = importCounts.get(file.path) || 0;
      const dependencyCount = dependencyCounts.get(file.path) || 0;
      const runtimeInfrastructure = (
        file.path.startsWith('lib/ai/') ||
        file.path.startsWith('lib/dreamteam/') ||
        file.path.startsWith('lib/memory/') ||
        file.path.startsWith('lib/codebase-intelligence/') ||
        file.path.startsWith('lib/autodev/') ||
        file.path === 'api/index.js'
      ) ? 1 : 0;
      const coreSubsystem = IMPORTANT_PREFIXES.some((prefix) => file.path.startsWith(prefix)) ? 1 : 0;
      const centralityScore = importedBy / maxImportedBy;
      const dependencyScore = dependencyCount / maxDependencyCount;
      const rawScore =
        (runtimeInfrastructure * 0.35) +
        (coreSubsystem * 0.25) +
        (centralityScore * 0.25) +
        (dependencyScore * 0.15);

      return {
        name: file.name,
        path: file.path,
        responsibility: inferResponsibility(file),
        dependencies,
        line_count: file.line_count,
        function_count: file.function_count,
        export_count: file.export_count,
        importance_score: Number(Math.min(0.99, Math.max(0.05, rawScore)).toFixed(2)),
      };
    })
    .sort((a, b) => b.importance_score - a.importance_score || a.path.localeCompare(b.path));
}

async function refineModuleSummary(module) {
  const fullPath = path.join(PROJECT_ROOT, module.path);
  const content = fs.readFileSync(fullPath, 'utf8').slice(0, 5000);
  const schema = z.object({
    responsibility: z.string(),
    dependencies: z.array(z.string()).default([]),
  });

  const model = await createModel({
    modelName: MODEL_REGISTRY.reasoning,
    routingContext: {
      message: `Refine summary for ${module.path}`,
      roleHint: 'reasoning',
    },
  });

  const refined = await model.withStructuredOutput(schema).invoke([
    ['system',
      [
        'You summarize repository modules for a codebase intelligence system.',
        'Return concise structured output only.',
        'Do not speculate beyond the provided file content and dependency hints.',
        'Keep the responsibility short and concrete.',
      ].join(' ')
    ],
    ['human',
      [
        `Module path: ${module.path}`,
        `Deterministic responsibility: ${module.responsibility}`,
        module.dependencies.length ? `Known dependencies: ${module.dependencies.join(', ')}` : 'Known dependencies: none',
        'File contents:',
        content,
      ].join('\n\n')
    ],
  ]);

  return {
    ...module,
    responsibility: refined.responsibility || module.responsibility,
    dependencies: refined.dependencies?.length ? refined.dependencies : module.dependencies,
    line_count: module.line_count,
    function_count: module.function_count,
    export_count: module.export_count,
    importance_score: module.importance_score,
  };
}

async function summarizeArchitecture(fileMap, dependencyMap) {
  const deterministicModules = buildDeterministicModules(fileMap, dependencyMap);
  const modules = [];

  for (const module of deterministicModules) {
    if (!isImportantModule(module.path)) {
      modules.push(module);
      continue;
    }

    try {
      modules.push(await refineModuleSummary(module));
    } catch {
      modules.push(module);
    }
  }

  const topLevelCounts = {};
  for (const file of fileMap.files) {
    topLevelCounts[file.topLevelDir] = (topLevelCounts[file.topLevelDir] || 0) + 1;
  }

  const highLevelSummary = [
    'This repository is organized around an AI orchestration core, execution tooling, governance, memory, and scaffolding.',
    `Largest top-level areas: ${Object.entries(topLevelCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([dir, count]) => `${dir} (${count})`)
      .join(', ')}.`,
    `Dependency map covers ${dependencyMap.dependencies.length} source modules with tracked imports.`,
  ].join(' ');

  return {
    generatedAt: Date.now(),
    summary: highLevelSummary,
    modules,
  };
}

export { summarizeArchitecture };
