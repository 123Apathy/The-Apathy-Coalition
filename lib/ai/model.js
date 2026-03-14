import { ChatAnthropic } from '@langchain/anthropic';
import { MODEL_REGISTRY, resolveCompatibleModel, getRoleCandidateModels } from './model-registry.js';
import { analyzeInput, selectModelRole } from './router.js';
import { choosePreferredModel, instrumentModel } from './model-performance.js';

const DEFAULT_MODELS = {
  anthropic: 'claude-sonnet-4-20250514',
  openai: 'gpt-4o',
  google: 'gemini-2.5-pro',
};

/**
 * Create a LangChain chat model based on environment configuration.
 *
 * Config env vars:
 *   LLM_PROVIDER    — "anthropic" (default), "openai", "google"
 *   LLM_MODEL       — Model name override (e.g. "claude-sonnet-4-20250514")
 *   ANTHROPIC_API_KEY — Required for anthropic provider
 *   OPENAI_API_KEY   — Required for openai provider (optional with OPENAI_BASE_URL)
 *   OPENAI_BASE_URL  — Custom OpenAI-compatible base URL (e.g. http://localhost:11434/v1 for Ollama)
 *   GOOGLE_API_KEY   — Required for google provider
 *
 * @param {object} [options]
 * @param {number} [options.maxTokens=4096] - Max tokens for the response
 * @param {string} [options.modelName] - Explicit model override
 * @param {string} [options.baseURL] - Explicit OpenAI-compatible base URL override
 * @param {object} [options.routingContext] - Request context used for deterministic routing
 * @returns {import('@langchain/core/language_models/chat_models').BaseChatModel}
 */
export async function createModel(options = {}) {
  const provider = process.env.LLM_PROVIDER || 'anthropic';
  const maxTokens = options.maxTokens || Number(process.env.LLM_MAX_TOKENS) || 4096;
  const requiresTools = options.requiresTools === true;
  const routingContext = {
    ...(options.routingContext || {}),
    baseURL: options.baseURL || process.env.OPENAI_BASE_URL,
  };
  const routingAnalysis = analyzeInput(routingContext);
  let routingDecision = {
    role: 'chat',
    source: 'default',
    reason: 'routing context missing; defaulting to chat',
  };

  let modelName = options.modelName || process.env.LLM_MODEL || DEFAULT_MODELS[provider] || DEFAULT_MODELS.anthropic;
  const modelPreferences = options.modelPreferences || options.userSettings?.models || null;

  if (provider === 'custom' && !options.modelName && !process.env.LLM_MODEL) {
    routingDecision = await selectModelRole(routingContext);
    const preferredModel = modelPreferences?.routingMode === 'preferred'
      ? modelPreferences?.[routingDecision.role]
      : null;
    if (preferredModel) {
      modelName = preferredModel;
      routingDecision = {
        ...routingDecision,
        source: 'user-preference',
        reason: `using preferred ${routingDecision.role} model from user settings`,
      };
    } else {
      modelName = choosePreferredModel(routingDecision.role, MODEL_REGISTRY[routingDecision.role]);
    }
    const compatibleModel = resolveCompatibleModel({
      preferredModel: modelName,
      role: routingDecision.role,
      requiresTools,
      candidateModels: getRoleCandidateModels(routingDecision.role),
    });
    if (compatibleModel !== modelName) {
      routingDecision = {
        ...routingDecision,
        source: requiresTools ? 'tool-fallback' : 'capability-fallback',
        reason: `selected model ${modelName} is incompatible with role ${routingDecision.role}${requiresTools ? ' + tools' : ''}; using ${compatibleModel} instead`,
      };
      modelName = compatibleModel;
    }
    console.log(`Routing: role=${routingDecision.role} model=${modelName} source=${routingDecision.source} reason="${routingDecision.reason}"`);
  }

  if (provider === 'custom' && modelName) {
    const compatibleModel = resolveCompatibleModel({
      preferredModel: modelName,
      role: routingDecision.role,
      requiresTools,
      candidateModels: getRoleCandidateModels(routingDecision.role),
    });
    if (compatibleModel !== modelName) {
      console.log(`Routing: capability fallback model=${compatibleModel} (original=${modelName}, role=${routingDecision.role}, tools=${requiresTools})`);
      modelName = compatibleModel;
    }
  }

  switch (provider) {
    case 'anthropic': {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY environment variable is required');
      }
      return new ChatAnthropic({
        modelName,
        maxTokens,
        anthropicApiKey: apiKey,
      });
    }
    case 'custom':
    case 'openai': {
      const { ChatOpenAI } = await import('@langchain/openai');
      const apiKey = provider === 'custom'
        ? (process.env.CUSTOM_API_KEY || 'not-needed')
        : process.env.OPENAI_API_KEY;
      const baseURL = options.baseURL || process.env.OPENAI_BASE_URL;
      if (!apiKey && !baseURL) {
        throw new Error('OPENAI_API_KEY environment variable is required (or set OPENAI_BASE_URL for local models)');
      }
      const config = { modelName, maxTokens };
      config.apiKey = apiKey || 'not-needed';
      if (baseURL) {
        config.configuration = { baseURL };
      }
      const model = instrumentModel(new ChatOpenAI(config), modelName);
      model.__routing = {
        role: routingDecision.role,
        modelName,
        source: routingDecision.source,
        reason: routingDecision.reason || routingAnalysis.reason,
      };
      return model;
    }
    case 'google': {
      const { ChatGoogleGenerativeAI } = await import('@langchain/google-genai');
      const apiKey = process.env.GOOGLE_API_KEY;
      if (!apiKey) {
        throw new Error('GOOGLE_API_KEY environment variable is required');
      }
      return new ChatGoogleGenerativeAI({
        model: modelName,
        maxOutputTokens: maxTokens,
        apiKey,
      });
    }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`);
  }
}
