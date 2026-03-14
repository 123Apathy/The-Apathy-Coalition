import fs from 'fs';
import { codebaseSystemMapFile } from '../paths.js';
import { buildDependencyMap } from './dependency-mapper.js';
import { summarizeArchitecture } from './architecture-summarizer.js';
import { buildFileMap } from './repo-scanner.js';
import { writeMemory } from '../memory/memory-writer.js';
import { buildCodeSearchIndex } from '../code-search/embedding-index-builder.js';
import { buildRepositoryGraph } from '../repo-graph/graph-builder.js';
import { writeRepoGraph } from '../repo-graph/graph-store.js';

async function runCodebaseIntelligence() {
  const fileMap = buildFileMap();
  const dependencyMap = buildDependencyMap(fileMap);
  const architecture = await summarizeArchitecture(fileMap, dependencyMap);
  const repoGraph = buildRepositoryGraph({ dependencyMap, systemMap: architecture });

  fs.writeFileSync(codebaseSystemMapFile, JSON.stringify(architecture, null, 2) + '\n');
  writeRepoGraph(repoGraph);

  await writeMemory({
    type: 'codebase',
    title: 'Repository system map',
    summary: architecture.summary,
    content: JSON.stringify(architecture, null, 2),
    tags: ['codebase', 'architecture', 'system-map'],
    model_bias: ['reasoning', 'coding'],
    source: { kind: 'codebase-intelligence', ref: 'system-map' },
  });

  let codeSearch = { documents: [], embeddings: [] };
  try {
    codeSearch = await buildCodeSearchIndex(fileMap);
  } catch (err) {
    console.warn('[code search] index refresh failed:', err.message);
  }

  return {
    fileMap,
    dependencyMap,
    architecture,
    repoGraph,
    codeSearch,
  };
}

export { runCodebaseIntelligence };
