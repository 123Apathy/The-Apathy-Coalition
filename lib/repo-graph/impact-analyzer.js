import { readRepoGraph } from './graph-store.js';
import { getImpactSet } from './graph-query.js';

function analyzeImpact(modifiedFile, graph = readRepoGraph()) {
  const affected_modules = getImpactSet(modifiedFile, graph);
  return {
    modified_file: modifiedFile,
    affected_modules,
  };
}

function analyzeChangeSetImpact(files = [], graph = readRepoGraph()) {
  const affected = new Set();
  for (const file of files) {
    for (const item of getImpactSet(file, graph)) {
      affected.add(item);
    }
  }

  return {
    modified_files: files,
    affected_modules: [...affected].sort(),
  };
}

export { analyzeImpact, analyzeChangeSetImpact };
