import { z } from 'zod';
import { createModel } from '../ai/model.js';
import { generateEmbedding } from '../memory/memory-retriever.js';
import { listSkills, upsertSkill, upsertSkillEmbedding } from './skill-registry.js';

const SkillSchema = z.object({
  skills: z.array(z.object({
    name: z.string(),
    description: z.string(),
    trigger_conditions: z.array(z.string()).default([]),
    recommended_steps: z.array(z.string()).default([]),
    confidence_score: z.number().min(0).max(1).default(0.6),
  })).default([]),
});

function formatSkillForEmbedding(skill) {
  return [
    `Skill: ${skill.name}`,
    `Description: ${skill.description}`,
    skill.trigger_conditions?.length ? `Triggers: ${skill.trigger_conditions.join(', ')}` : '',
    skill.recommended_steps?.length ? `Steps: ${skill.recommended_steps.join(' | ')}` : '',
  ].filter(Boolean).join('\n');
}

function shouldWriteSkills(results = {}) {
  const status = String(results.status || '').toLowerCase();
  const mergeResult = String(results.merge_result || '').toLowerCase();
  const changedFiles = results.changed_files || [];
  return (
    (status.includes('success') || status.includes('completed')) &&
    !mergeResult.includes('failed') &&
    changedFiles.some((file) => !String(file).startsWith('logs/'))
  );
}

async function extractSkillsFromExecution(results = {}) {
  const model = await createModel({
    routingContext: {
      message: `${results.job || ''}\n${results.commit_message || ''}\n${results.log || ''}`,
      roleHint: 'reasoning',
    },
    maxTokens: 1200,
  });

  return model.withStructuredOutput(SkillSchema).invoke([
    ['system',
      [
        'You extract reusable engineering skills from successful autonomous repository work.',
        'Only return skills that are generalizable and safe to reuse in future engineering tasks.',
        'Ignore one-off implementation details.',
        'Return JSON only with key: skills.',
      ].join(' ')
    ],
    ['human',
      [
        `Job:\n${results.job || 'Unknown task'}`,
        results.commit_message ? `Commit message:\n${results.commit_message}` : '',
        results.changed_files?.length ? `Changed files:\n- ${results.changed_files.join('\n- ')}` : '',
        results.log ? `Execution log excerpt:\n${String(results.log).slice(0, 4000)}` : '',
      ].filter(Boolean).join('\n\n')
    ],
  ]);
}

async function storeSkill(skillInput, source = { kind: 'execution' }) {
  const existing = listSkills().find((skill) => skill.name === skillInput.name);
  const skill = upsertSkill({
    ...existing,
    ...skillInput,
    confidence_score: existing
      ? Number(Math.min(0.99, ((existing.confidence_score + skillInput.confidence_score) / 2) + 0.05).toFixed(2))
      : skillInput.confidence_score,
    source,
  });
  const embedding = await generateEmbedding(formatSkillForEmbedding(skill), {
    namespace: 'skill-document',
    documentId: skill.id,
  });
  upsertSkillEmbedding({
    skill_id: skill.id,
    embedding,
  });
  return skill;
}

async function writeSkillsFromExecution(results = {}) {
  if (!shouldWriteSkills(results)) return [];

  const extracted = await extractSkillsFromExecution(results);
  const writes = [];

  for (const skill of extracted.skills || []) {
    if (!skill.name || !skill.description) continue;
    writes.push(storeSkill(skill, { kind: 'execution', ref: results.commit_message || results.status || 'success' }));
  }

  return Promise.allSettled(writes);
}

export { writeSkillsFromExecution };
