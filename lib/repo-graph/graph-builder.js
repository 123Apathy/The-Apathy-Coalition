function buildRepositoryGraph({ dependencyMap, systemMap } = {}) {
  const moduleMap = new Map((systemMap?.modules || []).map((module) => [module.path, module]));
  const nodeMap = new Map();
  const edges = [];

  for (const entry of dependencyMap?.dependencies || []) {
    const summary = moduleMap.get(entry.source);
    nodeMap.set(entry.source, {
      node: entry.source,
      type: 'file',
      name: summary?.name || entry.source.split('/').pop(),
      responsibility: summary?.responsibility || '',
      dependencies: entry.imports
        .filter((item) => item.type === 'internal')
        .map((item) => item.target),
      importance_score: summary?.importance_score || 0,
    });

    for (const imp of entry.imports) {
      if (imp.type !== 'internal') continue;
      edges.push({
        from: entry.source,
        to: imp.target,
        type: 'import',
      });
    }
  }

  for (const module of systemMap?.modules || []) {
    if (!nodeMap.has(module.path)) {
      nodeMap.set(module.path, {
        node: module.path,
        type: 'module',
        name: module.name,
        responsibility: module.responsibility || '',
        dependencies: module.dependencies || [],
        importance_score: module.importance_score || 0,
      });
    }

    for (const dep of module.dependencies || []) {
      edges.push({
        from: module.path,
        to: dep,
        type: 'module-dependency',
      });
    }
  }

  return {
    generatedAt: Date.now(),
    nodes: [...nodeMap.values()].sort((a, b) => a.node.localeCompare(b.node)),
    edges: edges
      .filter((edge, index, list) => list.findIndex((item) => item.from === edge.from && item.to === edge.to && item.type === edge.type) === index)
      .sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to) || a.type.localeCompare(b.type)),
  };
}

export { buildRepositoryGraph };
