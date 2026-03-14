import { readRepoGraph } from './graph-store.js';

function getDependencies(file, graph = readRepoGraph()) {
  const node = (graph.nodes || []).find((item) => item.node === file);
  return node?.dependencies || [];
}

function getDependents(file, graph = readRepoGraph()) {
  return (graph.edges || [])
    .filter((edge) => edge.to === file)
    .map((edge) => edge.from)
    .filter((item, index, list) => list.indexOf(item) === index)
    .sort();
}

function getImpactSet(file, graph = readRepoGraph()) {
  const visited = new Set();
  const queue = [file];

  while (queue.length) {
    const current = queue.shift();
    for (const dependent of getDependents(current, graph)) {
      if (visited.has(dependent) || dependent === file) continue;
      visited.add(dependent);
      queue.push(dependent);
    }
  }

  return [...visited].sort();
}

export { getDependencies, getDependents, getImpactSet };
