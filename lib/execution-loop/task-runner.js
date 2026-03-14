import { buildMemoryContextForTask } from '../memory/memory-retriever.js';
import { retrieveRelevantSkills } from '../skills/skill-retriever.js';
import { buildSkillContextBlock } from '../skills/skill-context-builder.js';
import { buildRepositorySearchContext } from '../code-search/semantic-search.js';
import { buildManagedPlanningContext } from '../context/context-budget-manager.js';
import { runTaskMarket } from '../task-market/task-market.js';
import { runDreamTeamReview } from '../dreamteam/orchestrator.js';
import { planChangeSets } from '../change-sets/change-set-planner.js';
import { analyzeChangeSetImpact } from '../repo-graph/impact-analyzer.js';
import { simulateArchitecture } from '../architecture-simulation/simulation-engine.js';
import { buildPersonalizationContext } from '../user-preferences.js';

async function buildInitialPlan(task, options = {}) {
  const { contextBlock: memoryContext, documents = [] } = await buildMemoryContextForTask({
    task,
    topK: options.memoryTopK || 4,
    modelBias: 'coding',
    userSettings: options.userSettings,
  });
  const personalizationContext = buildPersonalizationContext(options.userSettings?.personalization);
  const architectureMemory = documents
    .filter((doc) => ['architecture', 'codebase', 'governance'].includes(doc.type))
    .map((doc) => `[${doc.type}] ${doc.title}\n${doc.summary || doc.content || ''}`)
    .join('\n\n');
  const historicalMemory = documents
    .filter((doc) => !['architecture', 'codebase', 'governance'].includes(doc.type))
    .map((doc) => `[${doc.type}] ${doc.title}\n${doc.summary || doc.content || ''}`)
    .join('\n\n');

  const skills = await retrieveRelevantSkills({ taskDescription: task, topK: 3 });
  const skillContext = buildSkillContextBlock(skills);
  const { contextBlock: searchContext, results: searchResults } = await buildRepositorySearchContext({
    query: task,
    topK: options.searchTopK || 4,
  });

  const managed = await buildManagedPlanningContext({
    memoryContext,
    architectureMemory,
    historicalMemory,
    skillContext,
    repositorySearchContext: searchContext,
    dreamteamContext: [options.dreamteamContext || '', personalizationContext].filter(Boolean).join('\n\n'),
  });

  const market = await runTaskMarket(task, {
    userSettings: options.userSettings,
    memoryContext,
    architectureMemory,
    historicalMemory,
    skillContext,
    searchContext,
    searchResults,
    personalizationContext,
    managedContext: managed.contextBlock,
  });

  const selectedProposal = market.winner?.proposal || task;
  const review = await runDreamTeamReview({
    type: 'execution_loop_plan',
    title: 'Continuous execution loop plan',
    proposal: selectedProposal,
  });
  const approvedPlan = review.approved
    ? (typeof review.proposal === 'string' ? review.proposal : review.proposal?.proposal || selectedProposal)
    : null;
  const changeSets = approvedPlan
    ? await planChangeSets(approvedPlan, {
        searchContext,
        searchResults,
        managedContext: managed.contextBlock,
      })
    : [];
  const simulation = changeSets.length
    ? simulateArchitecture(changeSets)
    : { simulations: [], adjusted_change_sets: [], notes: [] };
  const graphImpact = changeSets.length
    ? analyzeChangeSetImpact(changeSets.flatMap((changeSet) => changeSet.files || []))
    : { modified_files: [], affected_modules: [] };

  return {
    task,
    memoryContext,
    skillContext,
    searchContext,
    searchResults,
    personalizationContext,
    managedContext: managed.contextBlock,
    market,
    review,
    approvedPlan,
    changeSets: simulation.adjusted_change_sets.length ? simulation.adjusted_change_sets : changeSets,
    graphImpact,
    simulation,
  };
}

export { buildInitialPlan };
