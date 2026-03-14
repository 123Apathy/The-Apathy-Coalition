import { prioritizeContextBlocks } from './context-prioritizer.js';
import { compressContextBlock } from './context-compressor.js';

const DEFAULT_MAX_CONTEXT_TOKENS = 3500;

function estimateTokens(text = '') {
  return Math.ceil(String(text || '').length / 4);
}

function joinBlocks(blocks = []) {
  return blocks
    .filter((block) => block?.content?.trim())
    .map((block) => block.content.trim())
    .join('\n\n');
}

async function buildManagedPlanningContext({
  memoryContext = '',
  architectureMemory = '',
  historicalMemory = '',
  skillContext = '',
  repositorySearchContext = '',
  dreamteamContext = '',
  maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS,
} = {}) {
  const prioritized = prioritizeContextBlocks([
    { type: 'repository_search', content: repositorySearchContext },
    { type: 'architecture_memory', content: architectureMemory },
    { type: 'dreamteam', content: dreamteamContext },
    { type: 'skill_context', content: skillContext },
    { type: 'historical_memory', content: historicalMemory || memoryContext },
  ]);

  let kept = [...prioritized];
  let contextBlock = joinBlocks(kept);
  let estimatedTokens = estimateTokens(contextBlock);

  while (estimatedTokens > maxContextTokens) {
    const droppable = [...kept].reverse().find((block) => !block.required);
    if (!droppable) break;

    const compressed = await compressContextBlock(droppable, {
      targetChars: Math.max(250, Math.floor((maxContextTokens * 4) / Math.max(1, kept.length))),
    });

    if (compressed && compressed.length < droppable.content.length * 0.8) {
      droppable.content = compressed;
    } else {
      kept = kept.filter((block) => block !== droppable);
    }

    contextBlock = joinBlocks(kept);
    estimatedTokens = estimateTokens(contextBlock);
  }

  return {
    blocks: kept,
    contextBlock,
    estimatedTokens,
    maxContextTokens,
  };
}

export { buildManagedPlanningContext, estimateTokens, DEFAULT_MAX_CONTEXT_TOKENS };
