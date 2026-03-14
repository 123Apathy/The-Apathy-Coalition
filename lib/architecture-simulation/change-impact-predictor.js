import { getDependencies, getDependents, getImpactSet } from '../repo-graph/graph-query.js';

function predictChangeImpact(changeSet, graph) {
  const files = changeSet.files || [];
  const dependents = new Set();
  const transitive = new Set();
  const sharedInterfaces = new Set();

  for (const file of files) {
    for (const dependent of getDependents(file, graph)) {
      dependents.add(dependent);
    }
    for (const impacted of getImpactSet(file, graph)) {
      transitive.add(impacted);
    }
    for (const dependency of getDependencies(file, graph)) {
      for (const sibling of getDependents(dependency, graph)) {
        if (sibling !== file) {
          sharedInterfaces.add(sibling);
        }
      }
    }
  }

  const predicted_impact = [...new Set([
    ...dependents,
    ...transitive,
    ...sharedInterfaces,
  ])].sort();

  return {
    change_set: changeSet.id,
    predicted_impact,
    dependents: [...dependents].sort(),
    transitive_dependencies: [...transitive].sort(),
    shared_interfaces: [...sharedInterfaces].sort(),
  };
}

export { predictChangeImpact };
