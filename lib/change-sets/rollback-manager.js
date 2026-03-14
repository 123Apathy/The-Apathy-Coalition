import { writeFailureMemory } from '../memory/memory-writer.js';

async function rollbackChangeSet(changeSet, context = {}) {
  const rollbackEvent = {
    change_set_id: changeSet.id,
    files: changeSet.files || [],
    reason: context.reason || 'verification failed',
    timestamp: Date.now(),
    rollback_prompt: [
      'Rollback this failed change set inside the sandbox workspace.',
      'Restore modified files to the last valid state.',
      'Do not touch the main branch.',
      `Change set: ${changeSet.id}`,
      changeSet.files?.length ? `Files:\n- ${changeSet.files.join('\n- ')}` : '',
    ].filter(Boolean).join('\n\n'),
  };

  await writeFailureMemory({
    title: `Rollback for ${changeSet.id}`,
    summary: `Rollback triggered for change set ${changeSet.id}.`,
    content: JSON.stringify({ changeSet, context, rollbackEvent }, null, 2),
    tags: ['change-set', 'rollback'],
    source: { kind: 'change-set', ref: changeSet.id },
  });

  console.warn(`[change-set rollback] id=${changeSet.id} files=${(changeSet.files || []).join(', ') || 'none'} reason=${rollbackEvent.reason}`);
  return rollbackEvent;
}

export { rollbackChangeSet };
