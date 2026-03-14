import { z } from 'zod';
import { createModel } from '../ai/model.js';

const ChangeSetSchema = z.object({
  change_sets: z.array(z.object({
    id: z.string(),
    goal: z.string(),
    files: z.array(z.string()).default([]),
    description: z.string(),
  })).default([]),
});

function normalizeChangeSet(changeSet, index) {
  return {
    id: changeSet.id || `cs-${index + 1}`,
    goal: changeSet.goal || `Change set ${index + 1}`,
    files: Array.isArray(changeSet.files) ? [...new Set(changeSet.files)].slice(0, 6) : [],
    description: changeSet.description || changeSet.goal || `Apply change set ${index + 1}`,
  };
}

function fallbackChangeSets(proposal, repositoryContext = {}) {
  const knownFiles = (repositoryContext.searchResults || [])
    .map((item) => item.file)
    .filter(Boolean)
    .slice(0, 4);

  return [
    {
      id: 'cs-1',
      goal: 'Apply approved repository improvement',
      files: knownFiles,
      description: typeof proposal === 'string' ? proposal : JSON.stringify(proposal, null, 2),
    },
  ];
}

async function planChangeSets(proposal, repositoryContext = {}) {
  const proposalText = typeof proposal === 'string' ? proposal : JSON.stringify(proposal, null, 2);

  try {
    const model = await createModel({
      routingContext: {
        message: proposalText,
        roleHint: 'reasoning',
      },
      maxTokens: 1200,
    });

    const response = await model.withStructuredOutput(ChangeSetSchema).invoke([
      ['system',
        [
          'You convert an approved software change proposal into atomic change sets.',
          'Each change set must affect as few files as possible, be logically testable, and follow dependency order.',
          'Prefer small coherent steps over broad edits.',
          'Return JSON only.',
        ].join(' ')
      ],
      ['human',
        [
          `Approved proposal:\n${proposalText}`,
          repositoryContext.searchContext ? `Repository context:\n${repositoryContext.searchContext}` : '',
          repositoryContext.managedContext ? `Managed context:\n${repositoryContext.managedContext}` : '',
          'Return change_sets with id, goal, files, description.',
        ].filter(Boolean).join('\n\n')
      ],
    ]);

    const planned = (response.change_sets || []).map(normalizeChangeSet).filter((item) => item.description);
    return planned.length ? planned : fallbackChangeSets(proposal, repositoryContext);
  } catch {
    return fallbackChangeSets(proposal, repositoryContext);
  }
}

export { planChangeSets };
