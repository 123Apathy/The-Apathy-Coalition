function tokenize(text = '') {
  return String(text)
    .toLowerCase()
    .split(/[^a-z0-9_/.:-]+/)
    .filter((token) => token.length > 2);
}

function scoreClarity(candidate) {
  const proposalLength = candidate.proposal?.trim().length || 0;
  const reasoningLength = candidate.reasoning?.trim().length || 0;
  let score = 0;
  if (proposalLength >= 40) score += 0.2;
  if (proposalLength <= 800) score += 0.2;
  if (reasoningLength >= 30) score += 0.15;
  if ((candidate.expected_changes || []).length >= 1) score += 0.15;
  if ((candidate.expected_changes || []).length <= 8) score += 0.1;
  return Math.min(1, score);
}

function scoreArchitectureAlignment(candidate, repositoryContext = {}) {
  const haystack = `${candidate.proposal} ${candidate.reasoning}`.toLowerCase();
  const searchHits = repositoryContext.searchResults || [];
  let score = 0;

  for (const hit of searchHits.slice(0, 5)) {
    const path = String(hit.file || '').toLowerCase();
    const name = path.split('/').pop();
    if (path && haystack.includes(path)) score += 0.25;
    else if (name && haystack.includes(name)) score += 0.15;
  }

  if (repositoryContext.searchContext && haystack.includes('architecture')) score += 0.15;
  if (haystack.includes('module') || haystack.includes('boundary') || haystack.includes('dependency')) score += 0.1;
  return Math.min(1, score);
}

function scoreScopeCorrectness(candidate, taskDescription) {
  const taskTokens = new Set(tokenize(taskDescription));
  const candidateTokens = tokenize(`${candidate.proposal} ${candidate.reasoning}`);
  if (!taskTokens.size) return 0;

  let overlap = 0;
  for (const token of candidateTokens) {
    if (taskTokens.has(token)) overlap++;
  }

  const changeCount = (candidate.expected_changes || []).length;
  const overlapScore = Math.min(1, overlap / Math.max(4, Math.ceil(taskTokens.size / 4)));
  const scopeScore = changeCount >= 1 && changeCount <= 8 ? 0.2 : 0.05;
  return Math.min(1, overlapScore * 0.8 + scopeScore);
}

function scoreRepositoryRelevance(candidate, repositoryContext = {}) {
  const contextTokens = new Set(tokenize([
    repositoryContext.memoryContext || '',
    repositoryContext.searchContext || '',
    ...(repositoryContext.searchResults || []).map((item) => item.file || ''),
  ].join(' ')));
  const candidateTokens = tokenize(`${candidate.proposal} ${candidate.reasoning} ${(candidate.expected_changes || []).join(' ')}`);
  if (!contextTokens.size) return 0.5;

  let overlap = 0;
  for (const token of candidateTokens) {
    if (contextTokens.has(token)) overlap++;
  }

  return Math.min(1, overlap / Math.max(5, Math.ceil(contextTokens.size / 10)));
}

function rankProposals(candidates = [], { taskDescription, repositoryContext = {} } = {}) {
  return candidates
    .map((candidate) => {
      const clarity = scoreClarity(candidate);
      const architectureAlignment = scoreArchitectureAlignment(candidate, repositoryContext);
      const scopeCorrectness = scoreScopeCorrectness(candidate, taskDescription);
      const relevance = scoreRepositoryRelevance(candidate, repositoryContext);
      const failurePenalty = candidate.failed ? 0.35 : 0;
      const score = Math.max(
        0,
        Number(((clarity * 0.25) + (architectureAlignment * 0.3) + (scopeCorrectness * 0.25) + (relevance * 0.2) - failurePenalty).toFixed(2))
      );

      return {
        ...candidate,
        score,
        signals: {
          clarity: Number(clarity.toFixed(2)),
          architecture_alignment: Number(architectureAlignment.toFixed(2)),
          scope_correctness: Number(scopeCorrectness.toFixed(2)),
          relevance: Number(relevance.toFixed(2)),
        },
      };
    })
    .sort((a, b) => b.score - a.score || a.agent_role.localeCompare(b.agent_role));
}

export { rankProposals };
