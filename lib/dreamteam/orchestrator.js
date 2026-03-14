import { z } from 'zod';
import { createModel } from '../ai/model.js';
import { MODEL_REGISTRY } from '../ai/model-registry.js';
import { writeDreamTeamMemories } from '../memory/memory-writer.js';
import { emitControlTowerEvent } from '../control-tower/event-bus.js';
import { synthesizeStageDecision } from './decision-synthesizer.js';
import { getExpertsForStage } from './stage-router.js';

const ExpertReviewSchema = z.object({
  decision: z.enum(['APPROVE', 'APPROVE_WITH_CHANGES', 'REJECT', 'ESCALATE']),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
  findings: z.array(z.string()).default([]),
  requiredChanges: z.array(z.string()).default([]),
});

function formatProposal(proposal) {
  if (typeof proposal === 'string') return proposal;
  return JSON.stringify(proposal, null, 2);
}

function buildExpertPrompt(stage, expert, proposalText) {
  return [
    `You are DreamTeam expert reviewer "${expert.name}" for stage ${stage}.`,
    'You review proposals only. You must not execute code, propose shell commands, or act as an implementation agent.',
    'Evaluate the proposal through your expert lens and return structured JSON only.',
    '',
    expert.instructions,
    '',
    'Return JSON with keys: decision, confidence, rationale, findings, requiredChanges.',
    'Allowed decisions: APPROVE, APPROVE_WITH_CHANGES, REJECT, ESCALATE.',
    '',
    'Proposal:',
    proposalText,
  ].join('\n');
}

async function reviewWithExpert(stage, expert, proposal) {
  const proposalText = formatProposal(proposal);
  const model = await createModel({
    modelName: MODEL_REGISTRY.reasoning,
    routingContext: {
      message: proposalText,
      roleHint: 'reasoning',
    },
  });

  const response = await model
    .withStructuredOutput(ExpertReviewSchema)
    .invoke([
      ['system', buildExpertPrompt(stage, expert, proposalText)],
      ['human', 'Review this proposal. Return JSON only.'],
    ]);

  return {
    expert: expert.name,
    domain: expert.domain,
    ...response,
  };
}

function applyDreamTeamChanges(proposal, stageDecision) {
  if (typeof proposal === 'string') {
    if (!stageDecision.requiredChanges?.length) return proposal;
    return `${proposal}\n\nDreamTeam required changes:\n- ${stageDecision.requiredChanges.join('\n- ')}`;
  }

  return {
    ...proposal,
    dreamteamRequiredChanges: [
      ...(proposal.dreamteamRequiredChanges || []),
      ...(stageDecision.requiredChanges || []),
    ],
  };
}

async function runDreamTeamReview(proposal) {
  let currentProposal = proposal;
  const stages = [];

  for (const stage of [1, 2, 3, 4]) {
    const experts = getExpertsForStage(stage);
    const expertOutputs = [];

    for (const expert of experts) {
      try {
        expertOutputs.push(await reviewWithExpert(stage, expert, currentProposal));
      } catch (err) {
        expertOutputs.push({
          expert: expert.name,
          domain: expert.domain,
          decision: 'ESCALATE',
          confidence: 0.4,
          rationale: `DreamTeam expert failed: ${err.message}`,
          findings: [],
          requiredChanges: [],
        });
      }
    }

    const stageDecision = synthesizeStageDecision(expertOutputs);
    stages.push({
      stage,
      experts: expertOutputs,
      decision: stageDecision,
    });

    if (stageDecision.decision === 'REJECT' || stageDecision.decision === 'ESCALATE') {
      const result = {
        approved: false,
        decision: stageDecision.decision,
        proposal: currentProposal,
        stages,
      };
      emitControlTowerEvent('dreamteam-decision', {
        approved: false,
        decision: result.decision,
        stageDomains: stages.flatMap((item) => item.experts.map((expert) => expert.domain)),
        stageCount: stages.length,
      });
      writeDreamTeamMemories(result, proposal).catch((err) => {
        console.warn('[memory] failed to write DreamTeam memory:', err.message);
      });
      return result;
    }

    if (stageDecision.decision === 'APPROVE_WITH_CHANGES') {
      currentProposal = applyDreamTeamChanges(currentProposal, stageDecision);
    }
  }

  const result = {
    approved: true,
    decision: stages.some((stage) => stage.decision.decision === 'APPROVE_WITH_CHANGES')
      ? 'APPROVE_WITH_CHANGES'
      : 'APPROVE',
    proposal: currentProposal,
    stages,
  };
  emitControlTowerEvent('dreamteam-decision', {
    approved: true,
    decision: result.decision,
    stageDomains: stages.flatMap((item) => item.experts.map((expert) => expert.domain)),
    stageCount: stages.length,
  });
  writeDreamTeamMemories(result, proposal).catch((err) => {
    console.warn('[memory] failed to write DreamTeam memory:', err.message);
  });
  return result;
}

export { runDreamTeamReview };
