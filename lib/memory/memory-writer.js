import { EMBEDDING_MODEL, generateEmbedding } from './memory-retriever.js';
import { formatMemoryForEmbedding } from './memory-schema.js';
import { ensureMemoryLayout, upsertMemoryDocument, upsertMemoryVector } from './memory-store.js';
import { emitControlTowerEvent } from '../control-tower/event-bus.js';

async function writeMemory(docInput) {
  ensureMemoryLayout();
  const doc = upsertMemoryDocument({
    embedding_model: EMBEDDING_MODEL,
    ...docInput,
  });
  const embedding = await generateEmbedding(formatMemoryForEmbedding(doc), {
    namespace: 'memory-document',
    documentId: doc.id,
  });
  upsertMemoryVector(doc.type, {
    memory_id: doc.id,
    embedding,
  });
  emitControlTowerEvent('memory-written', {
    id: doc.id,
    type: doc.type,
    title: doc.title,
  });
  return doc;
}

async function writeFailureMemory({ title, summary, content, tags = [], source = { kind: 'system' } }) {
  return writeMemory({
    type: 'failures',
    title,
    summary,
    content,
    tags: ['failure', ...tags],
    model_bias: ['reasoning', 'coding'],
    source,
  });
}

async function writeDreamTeamMemories(review, proposal) {
  const writes = [];
  const proposalText = typeof proposal === 'string' ? proposal : JSON.stringify(proposal, null, 2);

  writes.push(writeMemory({
    type: 'governance',
    title: `DreamTeam decision: ${review.decision}`,
    summary: `DreamTeam completed staged review with outcome ${review.decision}.`,
    content: [
      `Proposal:\n${proposalText}`,
      `Decision: ${review.decision}`,
      `Approved: ${review.approved}`,
      `Stages reviewed: ${review.stages?.length || 0}`,
    ].join('\n\n'),
    tags: ['dreamteam', 'governance'],
    model_bias: ['reasoning'],
    source: { kind: 'dreamteam', ref: review.decision },
  }));

  writes.push(writeMemory({
    type: 'decisions',
    title: `DreamTeam proposal decision`,
    summary: `Decision ${review.decision} recorded for an execution proposal.`,
    content: proposalText,
    tags: ['dreamteam', 'decision'],
    model_bias: ['reasoning', 'coding'],
    source: { kind: 'dreamteam', ref: review.decision },
  }));

  const allRequiredChanges = [];
  const allFindings = [];
  for (const stage of review.stages || []) {
    for (const expert of stage.experts || []) {
      writes.push(writeMemory({
        type: 'expert-learnings',
        title: `${expert.expert} review guidance`,
        summary: expert.rationale || 'DreamTeam expert review output.',
        content: [
          `Stage: ${stage.stage}`,
          `Expert: ${expert.expert}`,
          `Domain: ${expert.domain}`,
          `Decision: ${expert.decision}`,
          `Rationale: ${expert.rationale}`,
          expert.findings?.length ? `Findings:\n- ${expert.findings.join('\n- ')}` : '',
          expert.requiredChanges?.length ? `Required changes:\n- ${expert.requiredChanges.join('\n- ')}` : '',
        ].filter(Boolean).join('\n\n'),
        tags: ['dreamteam', 'expert-learning', expert.domain],
        model_bias: ['reasoning'],
        source: { kind: 'dreamteam', ref: expert.domain },
      }));
      allRequiredChanges.push(...(expert.requiredChanges || []));
      allFindings.push(...(expert.findings || []));
    }
  }

  if (allFindings.length || allRequiredChanges.length) {
    writes.push(writeMemory({
      type: 'architecture',
      title: 'DreamTeam architecture and governance learnings',
      summary: 'Consolidated architecture and governance learnings from DreamTeam review.',
      content: [
        allFindings.length ? `Findings:\n- ${[...new Set(allFindings)].join('\n- ')}` : '',
        allRequiredChanges.length ? `Required changes:\n- ${[...new Set(allRequiredChanges)].join('\n- ')}` : '',
      ].filter(Boolean).join('\n\n'),
      tags: ['dreamteam', 'architecture', 'governance'],
      model_bias: ['reasoning', 'coding'],
      source: { kind: 'dreamteam', ref: 'architecture' },
    }));
  }

  return Promise.allSettled(writes);
}

export { writeMemory, writeDreamTeamMemories, writeFailureMemory };
