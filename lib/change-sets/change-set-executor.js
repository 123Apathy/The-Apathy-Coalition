import { createJob } from '../tools/create-job.js';
import { buildVerificationPrompt, DEFAULT_GATES, evaluateVerificationGates } from './verification-gates.js';
import { rollbackChangeSet } from './rollback-manager.js';
import { analyzeChangeSetImpact } from '../repo-graph/impact-analyzer.js';
import { emitControlTowerEvent } from '../control-tower/event-bus.js';

function buildExecutionPrompt(changeSet, options = {}) {
  const impact = options.impact || {
    affected_modules: changeSet.verification_scope || changeSet.predicted_impact || analyzeChangeSetImpact(changeSet.files || []).affected_modules,
  };
  return [
    'Apply this atomic change set inside the existing sandbox job workspace.',
    'Keep changes focused to the listed files and goal.',
    'Do not modify the main branch directly.',
    'After making changes, run the verification gates and report PASS/FAIL/ERROR for each gate in the log.',
    '',
    `Change set id: ${changeSet.id}`,
    `Goal: ${changeSet.goal}`,
    changeSet.files?.length ? `Files:\n- ${changeSet.files.join('\n- ')}` : '',
    impact.affected_modules?.length ? `Affected modules to verify:\n- ${impact.affected_modules.join('\n- ')}` : '',
    `Description:\n${changeSet.description}`,
    '',
    buildVerificationPrompt({ ...changeSet, affected_modules: impact.affected_modules }, options.gates || DEFAULT_GATES),
  ].filter(Boolean).join('\n');
}

async function executeChangeSet(changeSet, options = {}) {
  const impact = options.impact || {
    affected_modules: changeSet.verification_scope || changeSet.predicted_impact || analyzeChangeSetImpact(changeSet.files || []).affected_modules,
  };
  const prompt = buildExecutionPrompt(changeSet, { ...options, impact });
  const job = await createJob(prompt, {
    jobType: options.jobType || 'repo_self_improvement',
  });

  console.log(`[change-set] scheduled id=${changeSet.id} files=${(changeSet.files || []).join(', ') || 'none'} impacted=${(impact.affected_modules || []).join(', ') || 'none'}`);
  emitControlTowerEvent('change-set-applied', {
    changeSetId: changeSet.id,
    files: changeSet.files || [],
    impacted: impact.affected_modules || [],
    status: 'scheduled',
    jobId: job.job_id,
  });

  if (typeof options.observeChangeSet !== 'function') {
    return {
      success: false,
      awaiting_observation: true,
      changeSet,
      job,
      verification: null,
      impact,
    };
  }

  const observed = await options.observeChangeSet({ changeSet, job });
  const verification = evaluateVerificationGates(observed, options.gates || DEFAULT_GATES);
  console.log(`[change-set] verification id=${changeSet.id} results=${verification.results.map((item) => `${item.gate}:${item.status}`).join(',')}`);
  emitControlTowerEvent('verification-result', {
    changeSetId: changeSet.id,
    ok: verification.ok,
    results: verification.results,
  });

  if (!verification.ok) {
    const rollback = await rollbackChangeSet(changeSet, {
      reason: 'verification gate failed',
      observed,
      verification,
    });
    return {
      success: false,
      changeSet,
      job,
      verification,
      rollback,
      observed,
      impact,
    };
  }

  return {
    success: true,
    changeSet,
    job,
    verification,
    observed,
    impact,
  };
}

export { executeChangeSet, buildExecutionPrompt };
