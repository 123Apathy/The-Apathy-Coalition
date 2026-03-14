import { createReactAgent } from '@langchain/langgraph/prebuilt';
import { SystemMessage } from '@langchain/core/messages';
import { createModel } from './model.js';
import { createJobTool, createRepoSelfImprovementJobTool, getJobStatusTool, getSystemTechnicalSpecsTool, getSkillBuildingGuideTool, getSkillDetailsTool, createStartHeadlessCodingTool, createGetRepositoryDetailsTool, createGetBranchFileTool } from './tools.js';
import { SqliteSaver } from '@langchain/langgraph-checkpoint-sqlite';
import { jobPlanningMd, codePlanningMd, thepopebotDb } from '../paths.js';
import { render_md } from '../utils/render-md.js';
import { createWebSearchTool, getProvider } from './web-search.js';
import { buildUserSettingsBundle, buildPersonalizationContext } from '../user-preferences.js';

const _jobAgents = new Map();

/**
 * Get or create the LangGraph job agent singleton.
 * Uses createReactAgent which handles the tool loop automatically.
 * Prompt is a function so {{datetime}} resolves fresh each invocation.
 */
export async function getJobAgent(routingContext = {}) {
  const userSettings = routingContext.userId ? buildUserSettingsBundle(routingContext.userId) : null;
  const personalizationContext = buildPersonalizationContext(userSettings?.personalization);
  const cacheKey = JSON.stringify({
    roleHint: routingContext.roleHint || null,
    attachments: routingContext.attachments || [],
    codeWorkspace: Boolean(routingContext.codeWorkspace || routingContext.workspaceId || routingContext.repo || routingContext.branch),
    embeddings: Boolean(routingContext.embeddings),
    personalization: personalizationContext,
    modelPreferences: userSettings?.models || null,
  });

  if (!_jobAgents.has(cacheKey)) {
    const model = await createModel({
      routingContext,
      userSettings,
      modelPreferences: userSettings?.models,
      requiresTools: true,
    });
    const tools = [createJobTool, createRepoSelfImprovementJobTool, getJobStatusTool, getSystemTechnicalSpecsTool, getSkillBuildingGuideTool, getSkillDetailsTool];

    const webSearchTool = await createWebSearchTool();
    if (webSearchTool) {
      tools.push(webSearchTool);
      console.log(`[agent] Web search enabled (provider: ${getProvider()})`);
    }

    const checkpointer = SqliteSaver.fromConnString(thepopebotDb);

    const agent = createReactAgent({
      llm: model,
      tools,
      checkpointSaver: checkpointer,
      prompt: (state) => [new SystemMessage([render_md(jobPlanningMd), personalizationContext].filter(Boolean).join('\n\n')), ...state.messages],
    });
    _jobAgents.set(cacheKey, agent);
  }
  return _jobAgents.get(cacheKey);
}

/**
 * Reset the agent singleton (e.g., when config changes).
 */
export function resetAgent() {
  _jobAgents.clear();
  _codeAgents.clear();
}

const _codeAgents = new Map();

/**
 * Get or create a code agent for a specific chat/workspace.
 * Each code chat gets its own agent with unique start_coding tool bindings.
 * @param {object} context
 * @param {string} context.repo - GitHub repo
 * @param {string} context.branch - Git branch
 * @param {string} context.workspaceId - Pre-created workspace row ID
 * @param {string} context.chatId - Chat thread ID
 * @returns {Promise<object>} LangGraph agent
 */
export async function getCodeAgent({ repo, branch, workspaceId, chatId, routingContext = {} }) {
  const userSettings = routingContext.userId ? buildUserSettingsBundle(routingContext.userId) : null;
  const personalizationContext = buildPersonalizationContext(userSettings?.personalization);
  const cacheKey = JSON.stringify({
    chatId,
    roleHint: 'coding',
    attachments: routingContext.attachments || [],
    personalization: personalizationContext,
    modelPreferences: userSettings?.models || null,
  });
  if (_codeAgents.has(cacheKey)) {
    return _codeAgents.get(cacheKey);
  }

  const startHeadlessCodingTool = createStartHeadlessCodingTool({ repo, branch, workspaceId });
  const getRepoDetailsTool = createGetRepositoryDetailsTool({ repo, branch });

  // Look up feature branch for get_branch_file tool
  const { getCodeWorkspaceById } = await import('../db/code-workspaces.js');
  const workspace = getCodeWorkspaceById(workspaceId);
  const featureBranch = workspace?.featureBranch || branch;
  const getBranchFileTool = createGetBranchFileTool({ repo, branch: featureBranch });
  const model = await createModel({
    routingContext: {
      ...routingContext,
      codeWorkspace: true,
      workspaceId,
      repo,
      branch,
      roleHint: 'coding',
    },
    userSettings,
    modelPreferences: userSettings?.models,
    requiresTools: true,
  });

  const tools = [startHeadlessCodingTool, getRepoDetailsTool, getBranchFileTool];

  const webSearchTool = await createWebSearchTool();
  if (webSearchTool) {
    tools.push(webSearchTool);
    console.log(`[agent] Web search enabled for code agent (provider: ${getProvider()})`);
  }

  const checkpointer = SqliteSaver.fromConnString(thepopebotDb);

  const agent = createReactAgent({
    llm: model,
    tools,
    checkpointSaver: checkpointer,
    prompt: (state) => [new SystemMessage([render_md(codePlanningMd), personalizationContext].filter(Boolean).join('\n\n')), ...state.messages],
  });

  _codeAgents.set(cacheKey, agent);
  return agent;
}
