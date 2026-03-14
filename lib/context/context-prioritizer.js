const DEFAULT_PRIORITIES = {
  repository_search: 100,
  architecture_memory: 90,
  dreamteam: 80,
  skill_context: 70,
  historical_memory: 60,
};

function prioritizeContextBlocks(blocks = []) {
  return [...blocks]
    .filter((block) => block?.content?.trim())
    .map((block) => ({
      priority: DEFAULT_PRIORITIES[block.type] || 10,
      required: Boolean(block.required),
      ...block,
    }))
    .sort((a, b) => b.priority - a.priority || a.type.localeCompare(b.type));
}

export { prioritizeContextBlocks, DEFAULT_PRIORITIES };
