function selectWinningProposal(rankedProposals = []) {
  const winner = rankedProposals[0];
  if (!winner) return null;

  return {
    winning_agent: winner.agent_role,
    proposal: winner.proposal,
    score: winner.score,
    reasoning: winner.reasoning,
    expected_changes: winner.expected_changes || [],
  };
}

export { selectWinningProposal };
