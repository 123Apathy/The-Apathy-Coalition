import { v4 as uuidv4 } from 'uuid';
import { z } from 'zod';
import { githubApi } from './github.js';
import { createModel } from '../ai/model.js';
import { runDreamTeamReview } from '../dreamteam/orchestrator.js';
import { buildMemoryContextForTask } from '../memory/memory-retriever.js';
import { retrieveRelevantSkills } from '../skills/skill-retriever.js';
import { buildSkillContextBlock } from '../skills/skill-context-builder.js';
import { buildRepositorySearchContext } from '../code-search/semantic-search.js';
import { buildManagedPlanningContext } from '../context/context-budget-manager.js';
import { runTaskMarket } from '../task-market/task-market.js';
import { analyzeImpact } from '../repo-graph/impact-analyzer.js';
import { emitControlTowerEvent } from '../control-tower/event-bus.js';
import { buildPersonalizationContext } from '../user-preferences.js';

/**
 * Generate a short descriptive title for a job using the LLM.
 * Uses structured output to avoid thinking-token leaks with extended-thinking models.
 * @param {string} jobDescription - The full job description
 * @returns {Promise<string>} ~10 word title
 */
async function generateJobTitle(jobDescription) {
  try {
    const model = await createModel({ maxTokens: 100 });
    const response = await model.withStructuredOutput(z.object({ title: z.string() })).invoke([
      ['system', 'Generate a descriptive ~10 word title for this agent job. The title should clearly describe what the job will do.'],
      ['human', jobDescription],
    ]);
    return response.title.trim() || jobDescription.slice(0, 80);
  } catch {
    // Fallback: first line, truncated
    const firstLine = jobDescription.split('\n').find(l => l.trim()) || jobDescription;
    return firstLine.replace(/^#+\s*/, '').trim().split(/\s+/).slice(0, 10).join(' ');
  }
}

/**
 * Create a new job branch with job.config.json
 * @param {string} jobDescription - The job description
 * @param {Object} [options] - Optional overrides
 * @param {string} [options.llmProvider] - LLM provider override (e.g. 'openai', 'anthropic')
 * @param {string} [options.llmModel] - LLM model override (e.g. 'gpt-4o', 'claude-sonnet-4-5-20250929')
 * @param {string} [options.agentBackend] - Agent backend override ('pi' or 'claude-code')
 * @param {string} [options.jobType] - Job type metadata (e.g. 'repo_self_improvement')
 * @returns {Promise<{job_id: string, branch: string, title: string}>} - Job ID, branch name, and title
 */
async function createJob(jobDescription, options = {}) {
  const { GH_OWNER, GH_REPO } = process.env;
  const jobId = uuidv4();
  const branch = `job/${jobId}`;
  const repo = `/repos/${GH_OWNER}/${GH_REPO}`;
  let reviewedJobDescription = jobDescription;
  let memoryContextBlock = '';
  let architectureMemoryBlock = '';
  let historicalMemoryBlock = '';
  let skillContextBlock = '';
  let repositorySearchContextBlock = '';
  let repositorySearchResults = [];
  let graphContextBlock = '';
  const personalizationContextBlock = buildPersonalizationContext(options.userSettings?.personalization);

  try {
    const { contextBlock, documents } = await buildMemoryContextForTask({
      task: jobDescription,
      topK: 4,
      modelBias: 'coding',
      userSettings: options.userSettings,
    });
    memoryContextBlock = contextBlock || '';
    architectureMemoryBlock = (documents || [])
      .filter((doc) => ['architecture', 'codebase', 'governance'].includes(doc.type))
      .map((doc) => `[${doc.type}] ${doc.title}\n${doc.summary || doc.content || ''}`)
      .join('\n\n');
    historicalMemoryBlock = (documents || [])
      .filter((doc) => !['architecture', 'codebase', 'governance'].includes(doc.type))
      .map((doc) => `[${doc.type}] ${doc.title}\n${doc.summary || doc.content || ''}`)
      .join('\n\n');
    if (contextBlock) {
      reviewedJobDescription = `${jobDescription}\n\n${contextBlock}`;
    }
  } catch (err) {
    console.warn('[memory] retrieval failed during job planning:', err.message);
  }

  try {
    const skills = await retrieveRelevantSkills({
      taskDescription: jobDescription,
      topK: 3,
    });
    skillContextBlock = buildSkillContextBlock(skills);
    if (skillContextBlock) {
      reviewedJobDescription = `${reviewedJobDescription}\n\n${skillContextBlock}`;
    }
  } catch (err) {
    console.warn('[skills] retrieval failed during job planning:', err.message);
  }

  try {
    const { contextBlock, results } = await buildRepositorySearchContext({
      query: jobDescription,
      topK: 4,
    });
    repositorySearchContextBlock = contextBlock || '';
    repositorySearchResults = results || [];
    if (contextBlock) {
      reviewedJobDescription = `${reviewedJobDescription}\n\n${contextBlock}`;
    }
  } catch (err) {
    console.warn('[code search] retrieval failed during job planning:', err.message);
  }

  try {
    const impacted = repositorySearchResults
      .slice(0, 3)
      .map((item) => analyzeImpact(item.file))
      .filter((item) => item.affected_modules.length);
    if (impacted.length) {
      graphContextBlock = [
        'Repository Graph Impact Context',
        ...impacted.map((item) => [
          `Modified file candidate: ${item.modified_file}`,
          `Affected modules: ${item.affected_modules.join(', ')}`,
        ].join('\n')),
      ].join('\n\n');
    }
  } catch (err) {
    console.warn('[repo graph] impact analysis failed during job planning:', err.message);
  }

  try {
    const budgeted = await buildManagedPlanningContext({
      memoryContext: memoryContextBlock,
      architectureMemory: architectureMemoryBlock,
      historicalMemory: historicalMemoryBlock,
      skillContext: skillContextBlock,
      repositorySearchContext: repositorySearchContextBlock,
      dreamteamContext: [graphContextBlock, personalizationContextBlock].filter(Boolean).join('\n\n'),
    });

    const market = await runTaskMarket(jobDescription, {
      userSettings: options.userSettings,
      memoryContext: memoryContextBlock,
      architectureMemory: architectureMemoryBlock,
      historicalMemory: historicalMemoryBlock,
      skillContext: skillContextBlock,
      searchContext: repositorySearchContextBlock,
      searchResults: repositorySearchResults,
      graphContext: graphContextBlock,
      personalizationContext: personalizationContextBlock,
      managedContext: budgeted.contextBlock,
    });
    if (market.winner?.proposal) {
      reviewedJobDescription = [
        `Original task:\n${jobDescription}`,
        `Task Market winner: ${market.winner.winning_agent} (score ${market.winner.score})`,
        `Selected proposal:\n${market.winner.proposal}`,
        market.winner.reasoning ? `Why this won:\n${market.winner.reasoning}` : '',
        market.winner.expected_changes?.length ? `Expected changes:\n- ${market.winner.expected_changes.join('\n- ')}` : '',
        personalizationContextBlock,
        budgeted.contextBlock,
      ].filter(Boolean).join('\n\n');
    }
  } catch (err) {
    console.warn('[task market] planning contest failed:', err.message);
  }

  if (!options.skipDreamTeamReview) {
    const review = await runDreamTeamReview({
      type: options.jobType || 'job',
      title: options.title || 'Execution proposal',
      proposal: reviewedJobDescription,
      llmProvider: options.llmProvider || null,
      llmModel: options.llmModel || null,
    });

    if (!review.approved) {
      throw new Error(`DreamTeam ${review.decision}: execution proposal blocked`);
    }

    reviewedJobDescription = typeof review.proposal === 'string'
      ? review.proposal
      : review.proposal.proposal || reviewedJobDescription;
  }

  // Generate a short descriptive title
  const title = await generateJobTitle(reviewedJobDescription);

  // 1. Get main branch SHA and its tree SHA
  const mainRef = await githubApi(`${repo}/git/ref/heads/main`);
  const mainSha = mainRef.object.sha;
  const mainCommit = await githubApi(`${repo}/git/commits/${mainSha}`);
  const baseTreeSha = mainCommit.tree.sha;

  // 2. Build job.config.json — single source of truth for job metadata
  const config = { title, job: reviewedJobDescription };
  if (options.llmProvider) config.llm_provider = options.llmProvider;
  if (options.llmModel) config.llm_model = options.llmModel;
  if (options.agentBackend) config.agent_backend = options.agentBackend;
  if (options.jobType) config.job_type = options.jobType;

  const treeEntries = [
    {
      path: `logs/${jobId}/job.config.json`,
      mode: '100644',
      type: 'blob',
      content: JSON.stringify(config, null, 2),
    },
  ];

  // 3. Create tree (base_tree preserves all existing files)
  const tree = await githubApi(`${repo}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeEntries,
    }),
  });

  // 4. Create a single commit with job config
  const commit = await githubApi(`${repo}/git/commits`, {
    method: 'POST',
    body: JSON.stringify({
      message: `🤖 Agent Job: ${title}`,
      tree: tree.sha,
      parents: [mainSha],
    }),
  });

  // 5. Create branch pointing to the commit (triggers run-job.yml)
  await githubApi(`${repo}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({
      ref: `refs/heads/${branch}`,
      sha: commit.sha,
    }),
  });

  emitControlTowerEvent('task-created', {
    jobId,
    branch,
    title,
    jobType: options.jobType || 'job',
  });

  return { job_id: jobId, branch, title };
}

export { createJob };
