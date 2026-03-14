import { runAgentContest } from './agent-contest.js';
import { rankProposals } from './solution-ranking.js';
import { selectWinningProposal } from './winner-selection.js';
import { findCachedPlannerResult, storePlannerResult } from '../planner-cache/planner-cache.js';
import { emitControlTowerEvent } from '../control-tower/event-bus.js';

async function runTaskMarket(taskDescription, repositoryContext = {}) {
  const cached = await findCachedPlannerResult(taskDescription);
  if (cached) {
    const result = {
      task: taskDescription,
      proposals: [],
      ranked_proposals: [],
      winner: {
        winning_agent: cached.winning_agent,
        proposal: cached.winning_proposal,
        score: cached.score,
        reasoning: cached.reasoning,
        expected_changes: cached.expected_changes || [],
      },
      cache: {
        hit: true,
        similarity: cached.similarity,
        timestamp: cached.timestamp,
      },
    };
    emitControlTowerEvent('task-market-result', {
      source: 'cache',
      task: taskDescription,
      winner: result.winner,
      similarity: cached.similarity,
    });
    return result;
  }

  const proposals = await runAgentContest(taskDescription, repositoryContext);
  const rankedProposals = rankProposals(proposals, { taskDescription, repositoryContext });
  const winner = selectWinningProposal(rankedProposals);
  if (winner) {
    storePlannerResult({ taskDescription, winner }).catch(() => {});
  }

  const result = {
    task: taskDescription,
    proposals,
    ranked_proposals: rankedProposals,
    winner,
    cache: {
      hit: false,
    },
  };
  emitControlTowerEvent('task-market-result', {
    source: 'contest',
    task: taskDescription,
    winner,
    proposalCount: proposals.length,
  });
  return result;
}

export { runTaskMarket };
