import { runDreamTeamReview } from '../dreamteam/orchestrator.js';
import { executeChangeSet } from '../change-sets/change-set-executor.js';

function estimateRisk(step = {}) {
  if (step.risk_level) return step.risk_level;
  const text = `${step.title || ''} ${step.description || ''}`.toLowerCase();
  if (text.includes('delete') || text.includes('migration') || text.includes('security') || text.includes('auth')) {
    return 'high';
  }
  if (text.includes('refactor') || text.includes('test') || text.includes('command')) {
    return 'medium';
  }
  return 'low';
}

async function executeStep(step, options = {}) {
  if (step.changeSet) {
    const changeSetRisk = estimateRisk({
      title: step.changeSet.goal,
      description: step.changeSet.description,
      risk_level: step.risk_level,
    });
    if (changeSetRisk === 'high') {
      const review = await runDreamTeamReview({
        type: 'change_set',
        title: step.changeSet.goal || 'Change set review',
        proposal: step.changeSet.description || step.changeSet.goal || '',
      });
      if (!review.approved) {
        return {
          success: false,
          blocked: true,
          risk_level: changeSetRisk,
          review,
        };
      }
    }

    return executeChangeSet(step.changeSet, {
      ...options,
      gates: options.gates,
      observeChangeSet: options.observeChangeSet,
    });
  }

  const riskLevel = estimateRisk(step);
  if (riskLevel === 'high') {
    const review = await runDreamTeamReview({
      type: 'execution_loop_step',
      title: step.title || 'Execution loop step',
      proposal: step.description || step.title || '',
    });
    if (!review.approved) {
      return {
        success: false,
        blocked: true,
        risk_level: riskLevel,
        review,
      };
    }
  }

  return executeChangeSet({
    id: step.id || 'cs-generic',
    goal: step.title || 'Execution step',
    files: step.files || [],
    description: step.description || '',
  }, options);
}

export { executeStep, estimateRisk };
