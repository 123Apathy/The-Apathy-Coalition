function mapIssueToOpportunity(issue) {
  switch (issue.issue) {
    case 'large-module':
      return {
        module: issue.module,
        opportunity: 'split-large-module',
        action: 'Split the module into smaller focused files',
        rationale: 'The file exceeds the recommended size threshold and likely mixes responsibilities.',
        risk_level: 'medium',
      };
    case 'high-dependency-count':
      return {
        module: issue.module,
        opportunity: 'reduce-dependency-chain',
        action: 'Extract shared utilities and reduce direct imports',
        rationale: 'High dependency count increases coupling and change risk.',
        risk_level: 'medium',
      };
    case 'high-function-count':
      return {
        module: issue.module,
        opportunity: 'group-related-functions',
        action: 'Move related helpers into dedicated utility modules',
        rationale: 'Too many functions in one module often signals missing boundaries.',
        risk_level: 'low',
      };
    case 'high-importance-large-module':
      return {
        module: issue.module,
        opportunity: 'stabilize-core-module',
        action: 'Separate core logic from secondary responsibilities',
        rationale: 'Critical modules should stay small and easy to reason about.',
        risk_level: 'medium',
      };
    case 'high-complexity-low-cohesion':
      return {
        module: issue.module,
        opportunity: 'improve-cohesion',
        action: 'Isolate responsibilities and reduce mixed concerns',
        rationale: 'The module appears both complex and overloaded.',
        risk_level: 'medium',
      };
    case 'architecture-inconsistency':
      return {
        module: issue.module,
        opportunity: 'normalize-architecture-boundaries',
        action: 'Reduce cross-subsystem coupling and define clearer ownership',
        rationale: 'The module touches too many subsystems for its current boundary.',
        risk_level: 'medium',
      };
    default:
      return {
        module: issue.module,
        opportunity: 'review-module',
        action: 'Review module boundaries and simplify where safe',
        rationale: 'General improvement opportunity detected.',
        risk_level: 'low',
      };
  }
}

function planImprovementOpportunities(issueReport) {
  const issues = issueReport?.issues || [];
  return {
    planned_at: Date.now(),
    opportunities: issues.map(mapIssueToOpportunity),
  };
}

export { planImprovementOpportunities };
