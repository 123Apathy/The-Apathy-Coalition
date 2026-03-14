import { readRepoGraph } from '../repo-graph/graph-store.js';
import { predictChangeImpact } from './change-impact-predictor.js';
import { analyzeRefactorRisk } from './refactor-risk-analyzer.js';
import { adjustSimulatedChangeSets } from './simulation-adjuster.js';

function simulateArchitecture(changeSets = []) {
  const graph = readRepoGraph();
  const simulations = changeSets.map((changeSet) => {
    const impact = predictChangeImpact(changeSet, graph);
    const risk_score = analyzeRefactorRisk(changeSet, impact);
    return {
      ...changeSet,
      predicted_impact: impact.predicted_impact,
      dependent_modules: impact.dependents,
      transitive_dependencies: impact.transitive_dependencies,
      shared_interfaces: impact.shared_interfaces,
      risk_score,
    };
  });

  const adjusted = adjustSimulatedChangeSets(simulations);

  return {
    simulations: simulations.map((item) => ({
      change_set: item.id,
      predicted_impact: item.predicted_impact,
      risk_score: item.risk_score,
    })),
    adjusted_change_sets: adjusted.adjusted_change_sets,
    notes: adjusted.notes,
  };
}

export { simulateArchitecture };
