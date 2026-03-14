const SCORES = {
  APPROVE: 1,
  APPROVE_WITH_CHANGES: 0.5,
  ESCALATE: 0,
  REJECT: -1,
};

function normalizeConfidence(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0.5;
  return Math.max(0, Math.min(1, value));
}

function synthesizeStageDecision(outputs = []) {
  if (outputs.length === 0) {
    return {
      decision: 'ESCALATE',
      confidence: 0,
      summary: 'No DreamTeam expert outputs were available.',
      findings: [],
      requiredChanges: [],
    };
  }

  const weighted = outputs.map((output) => {
    const confidence = normalizeConfidence(output.confidence);
    const score = SCORES[output.decision] ?? 0;
    return { ...output, confidence, score, weightedScore: score * confidence };
  });

  const rejectWeight = weighted
    .filter((item) => item.decision === 'REJECT')
    .reduce((sum, item) => sum + item.confidence, 0);
  const escalateWeight = weighted
    .filter((item) => item.decision === 'ESCALATE')
    .reduce((sum, item) => sum + item.confidence, 0);
  const avgScore = weighted.reduce((sum, item) => sum + item.weightedScore, 0) / weighted.length;

  let decision = 'APPROVE';
  if (rejectWeight >= 1.2 || avgScore < -0.15) {
    decision = 'REJECT';
  } else if (escalateWeight >= 1.0) {
    decision = 'ESCALATE';
  } else if (weighted.some((item) => item.decision === 'APPROVE_WITH_CHANGES')) {
    decision = 'APPROVE_WITH_CHANGES';
  }

  const findings = weighted.flatMap((item) => item.findings || []);
  const requiredChanges = weighted.flatMap((item) => item.requiredChanges || []);

  return {
    decision,
    confidence: Number((weighted.reduce((sum, item) => sum + item.confidence, 0) / weighted.length).toFixed(2)),
    summary: `DreamTeam stage decision: ${decision}`,
    findings,
    requiredChanges: [...new Set(requiredChanges)],
    votes: weighted.map((item) => ({
      expert: item.expert,
      decision: item.decision,
      confidence: item.confidence,
      rationale: item.rationale,
    })),
  };
}

export { synthesizeStageDecision };
