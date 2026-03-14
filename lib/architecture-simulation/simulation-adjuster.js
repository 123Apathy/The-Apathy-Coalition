function sortByRisk(changeSets = []) {
  const order = { low: 0, medium: 1, high: 2 };
  return [...changeSets].sort((a, b) => {
    const riskDiff = (order[a.risk_score] ?? 9) - (order[b.risk_score] ?? 9);
    if (riskDiff !== 0) return riskDiff;
    return (a.predicted_impact?.length || 0) - (b.predicted_impact?.length || 0);
  });
}

function maybeAddVerificationChangeSet(changeSet) {
  if (changeSet.risk_score !== 'high' || (changeSet.predicted_impact || []).length < 5) {
    return [changeSet];
  }

  return [
    changeSet,
    {
      id: `${changeSet.id}-verify`,
      goal: `Stabilize and verify ${changeSet.id}`,
      files: [],
      description: `Run expanded verification and interface checks for impacted modules after ${changeSet.id}.`,
      predicted_impact: changeSet.predicted_impact,
      risk_score: 'medium',
      verification_scope: [...new Set([...(changeSet.files || []), ...(changeSet.predicted_impact || [])])],
      simulated: true,
    },
  ];
}

function adjustSimulatedChangeSets(simulations = []) {
  const withScope = simulations.map((simulation) => ({
    ...simulation,
    verification_scope: [...new Set([...(simulation.files || []), ...(simulation.predicted_impact || [])])],
  }));

  const adjusted = sortByRisk(withScope).flatMap(maybeAddVerificationChangeSet);

  return {
    adjusted_change_sets: adjusted,
    notes: [
      'Execution order favors lower-risk, lower-blast-radius changes first.',
      'Verification scope includes impacted modules from the repository graph.',
    ],
  };
}

export { adjustSimulatedChangeSets };
