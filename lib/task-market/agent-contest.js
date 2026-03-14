import { z } from 'zod';
import { createModel } from '../ai/model.js';

const ProposalSchema = z.object({
  agent_role: z.string(),
  proposal: z.string(),
  reasoning: z.string(),
  expected_changes: z.array(z.string()).default([]),
});

const AGENT_ROLES = [
  {
    name: 'coding-agent',
    roleHint: 'coding',
    perspective: 'Focus on implementation realism, touched files, and safe code changes.',
  },
  {
    name: 'reasoning-agent',
    roleHint: 'reasoning',
    perspective: 'Focus on problem decomposition, sequencing, and correctness.',
  },
  {
    name: 'architecture-agent',
    roleHint: 'reasoning',
    perspective: 'Focus on module boundaries, cohesion, and repository architecture alignment.',
  },
];

function formatRepositoryContext(repositoryContext = {}) {
  return [
    repositoryContext.managedContext ? `Managed planning context:\n${repositoryContext.managedContext}` : '',
    repositoryContext.memoryContext ? `Memory context:\n${repositoryContext.memoryContext}` : '',
    repositoryContext.skillContext ? `Skill context:\n${repositoryContext.skillContext}` : '',
    repositoryContext.searchContext ? `Repository search context:\n${repositoryContext.searchContext}` : '',
    repositoryContext.graphContext ? `Repository graph impact context:\n${repositoryContext.graphContext}` : '',
    repositoryContext.personalizationContext ? `User preference context:\n${repositoryContext.personalizationContext}` : '',
    repositoryContext.searchResults?.length
      ? `Relevant files:\n- ${repositoryContext.searchResults.map((item) => item.file).join('\n- ')}`
      : '',
  ].filter(Boolean).join('\n\n');
}

async function generateRoleProposal(taskDescription, repositoryContext, role) {
  const model = await createModel({
    routingContext: {
      message: `${role.name}\n${taskDescription}`,
      roleHint: role.roleHint,
      repoContext: true,
    },
    userSettings: repositoryContext.userSettings,
    modelPreferences: repositoryContext.userSettings?.models,
    maxTokens: 1200,
  });

  const context = formatRepositoryContext(repositoryContext);
  const response = await model.withStructuredOutput(ProposalSchema).invoke([
    ['system',
      [
        `You are the ${role.name} in a local planning contest for PopeBot.`,
        'You generate a proposal only. You must not execute code or claim to have changed files.',
        'Return concise structured output only.',
        role.perspective,
        'The proposal should be implementation-ready for later DreamTeam review and sandboxed execution.',
      ].join(' ')
    ],
    ['human',
      [
        `Task:\n${taskDescription}`,
        context ? `Repository context:\n${context}` : '',
        'Return JSON with: agent_role, proposal, reasoning, expected_changes.',
      ].filter(Boolean).join('\n\n')
    ],
  ]);

  return {
    agent_role: role.name,
    proposal: response.proposal,
    reasoning: response.reasoning,
    expected_changes: response.expected_changes || [],
  };
}

async function runAgentContest(taskDescription, repositoryContext = {}) {
  const settled = await Promise.allSettled(
    AGENT_ROLES.map((role) => generateRoleProposal(taskDescription, repositoryContext, role))
  );

  return settled
    .map((result, index) => {
      if (result.status === 'fulfilled') return result.value;
      return {
        agent_role: AGENT_ROLES[index].name,
        proposal: '',
        reasoning: `Proposal generation failed: ${result.reason?.message || 'unknown error'}`,
        expected_changes: [],
        failed: true,
      };
    });
}

export { runAgentContest };
