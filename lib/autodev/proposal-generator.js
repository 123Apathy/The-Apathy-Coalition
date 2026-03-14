import { buildMemoryContextForTask } from '../memory/memory-retriever.js';

function buildProposalText(opportunity) {
  switch (opportunity.opportunity) {
    case 'split-large-module':
      return `Split ${opportunity.module} into smaller focused modules.`;
    case 'reduce-dependency-chain':
      return `Reduce dependency chains in ${opportunity.module} by extracting shared utilities.`;
    case 'group-related-functions':
      return `Refactor ${opportunity.module} to group related functions into smaller modules.`;
    case 'stabilize-core-module':
      return `Separate core logic from secondary responsibilities in ${opportunity.module}.`;
    case 'improve-cohesion':
      return `Improve cohesion in ${opportunity.module} by isolating mixed responsibilities.`;
    case 'normalize-architecture-boundaries':
      return `Reduce cross-subsystem coupling in ${opportunity.module}.`;
    default:
      return `Review and improve ${opportunity.module}.`;
  }
}

async function generateImprovementProposals(plan) {
  const proposals = [];

  for (const opportunity of plan?.opportunities || []) {
    const proposal = buildProposalText(opportunity);
    let memoryContext = '';

    try {
      const { contextBlock } = await buildMemoryContextForTask({
        task: proposal,
        topK: 3,
        modelBias: 'coding',
      });
      memoryContext = contextBlock;
    } catch {}

    proposals.push({
      proposal,
      reason: opportunity.rationale,
      expected_benefit: opportunity.opportunity === 'normalize-architecture-boundaries'
        ? 'clearer subsystem boundaries'
        : 'improved maintainability',
      risk_level: opportunity.risk_level,
      module: opportunity.module,
      memory_context: memoryContext,
    });
  }

  return {
    generated_at: Date.now(),
    proposals,
  };
}

export { generateImprovementProposals };
