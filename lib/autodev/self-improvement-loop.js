import cron from 'node-cron';
import { MODEL_REGISTRY } from '../ai/model-registry.js';
import { runDreamTeamReview } from '../dreamteam/orchestrator.js';
import { writeFailureMemory } from '../memory/memory-writer.js';
import { createJob } from '../tools/create-job.js';
import { scanImprovementIssues } from './improvement-scanner.js';
import { planImprovementOpportunities } from './improvement-planner.js';
import { generateImprovementProposals } from './proposal-generator.js';

let _selfImprovementTask = null;

function buildExecutionPrompt(proposal) {
  const memoryContext = proposal.memory_context?.trim()
    ? `\nRelevant memory context:\n${proposal.memory_context}\n`
    : '';

  return `Execute this approved self-improvement proposal in a sandboxed job workspace.

Proposal:
${proposal.proposal}

Reason:
${proposal.reason}

Expected benefit:
${proposal.expected_benefit}

Risk level:
${proposal.risk_level}${memoryContext}

Execution safety rules:
- Never modify the main branch directly
- Work only inside the job branch / sandbox workspace
- Keep the patch focused to this proposal
- Run QA automation before finishing
- Prefer project-native QA commands when available
- If QA fails, do not leave partial code changes behind
- Make the result suitable for a pull request review

QA expectations:
- Run the most relevant available checks for the touched area
- Prefer targeted tests first, then broader validation if reasonable
- If no formal tests exist, run the cheapest meaningful validation you can find
- If validation fails, stop and report failure clearly`;
}

async function reviewProposal(proposal) {
  return runDreamTeamReview({
    type: 'self_improvement_proposal',
    title: 'Autonomous self-improvement proposal',
    proposal,
  });
}

async function handleRejectedProposal(proposal, review, reasonTag = 'rejected') {
  await writeFailureMemory({
    title: `Self-improvement proposal ${review.decision.toLowerCase()}`,
    summary: `Proposal was ${review.decision.toLowerCase()} by DreamTeam governance.`,
    content: JSON.stringify({ proposal, review }, null, 2),
    tags: ['autodev', reasonTag],
    source: { kind: 'autodev', ref: review.decision },
  });
}

async function executeApprovedProposal(proposal) {
  const prompt = buildExecutionPrompt(proposal);
  return createJob(prompt, {
    jobType: 'repo_self_improvement',
    llmModel: MODEL_REGISTRY.coding,
    skipDreamTeamReview: true,
  });
}

async function runSelfImprovementLoop(options = {}) {
  const maxProposals = options.maxProposals || 1;
  const issueReport = scanImprovementIssues();
  const plan = planImprovementOpportunities(issueReport);
  const generated = await generateImprovementProposals(plan);
  const results = [];

  for (const proposal of generated.proposals.slice(0, maxProposals)) {
    const review = await reviewProposal(proposal);

    if (!review.approved) {
      await handleRejectedProposal(proposal, review);
      results.push({ proposal, review, status: 'blocked' });
      continue;
    }

    if (proposal.risk_level === 'high') {
      const escalatedReview = { ...review, decision: 'ESCALATE', approved: false };
      await handleRejectedProposal(proposal, escalatedReview, 'high-risk-escalation');
      results.push({ proposal, review: escalatedReview, status: 'escalated' });
      continue;
    }

    const job = await executeApprovedProposal(proposal);
    results.push({ proposal, review, status: 'scheduled', job });
  }

  return {
    scanned_at: issueReport.scanned_at,
    issues: issueReport.issues,
    opportunities: plan.opportunities,
    proposals: generated.proposals,
    results,
  };
}

function startSelfImprovementScheduler(schedule = process.env.SELF_IMPROVEMENT_CRON) {
  if (!schedule || !cron.validate(schedule) || _selfImprovementTask) return null;

  _selfImprovementTask = cron.schedule(schedule, () => {
    runSelfImprovementLoop().catch((err) => {
      console.warn('[autodev] self-improvement loop failed:', err.message);
    });
  });

  return _selfImprovementTask;
}

function stopSelfImprovementScheduler() {
  if (_selfImprovementTask) {
    _selfImprovementTask.stop();
    _selfImprovementTask = null;
  }
}

export { runSelfImprovementLoop, startSelfImprovementScheduler, stopSelfImprovementScheduler };
