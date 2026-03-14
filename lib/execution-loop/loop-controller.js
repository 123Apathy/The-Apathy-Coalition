import { buildInitialPlan } from './task-runner.js';
import { executeStep } from './step-executor.js';
import { analyzeObservation } from './observation-analyzer.js';
import { writeFailureMemory } from '../memory/memory-writer.js';
import { emitControlTowerEvent } from '../control-tower/event-bus.js';

function toExecutionSteps(plan) {
  if (plan.changeSets?.length) {
    return plan.changeSets.map((changeSet) => ({
      id: changeSet.id,
      title: changeSet.goal,
      description: changeSet.description,
      files: changeSet.files || [],
      risk_level: changeSet.risk_score || 'medium',
      changeSet,
    }));
  }

  return [{
    id: 'cs-fallback',
    title: 'Implement approved plan',
    description: plan.approvedPlan || plan.task,
    risk_level: 'medium',
  }];
}

async function runContinuousExecutionLoop(task, options = {}) {
  const iterationLimit = options.iterationLimit || Number(process.env.CHANGE_SET_RETRY_LIMIT) || Number(process.env.EXECUTION_LOOP_MAX_ITERATIONS) || 3;
  const plan = await buildInitialPlan(task, options);

  if (!plan.review.approved || !plan.approvedPlan) {
    await writeFailureMemory({
      title: 'Execution loop plan blocked',
      summary: `DreamTeam ${plan.review.decision} blocked continuous execution planning.`,
      content: JSON.stringify(plan.review, null, 2),
      tags: ['execution-loop', 'governance'],
      source: { kind: 'execution-loop', ref: plan.review.decision },
    });
    return {
      success: false,
      stage: 'planning',
      plan,
    };
  }

  const iterations = [];
  const steps = toExecutionSteps(plan);

  for (const step of steps) {
    let currentStep = step;
    let completedStep = false;

    for (let attempt = 1; attempt <= iterationLimit; attempt++) {
      emitControlTowerEvent('execution-loop-step', {
        changeSetId: currentStep.id,
        attempt,
        title: currentStep.title,
        status: 'started',
      });
      const execution = await executeStep(currentStep, options);
      iterations.push({ change_set_id: currentStep.id, attempt, step: currentStep, execution });

      if (!execution.success) {
        await writeFailureMemory({
          title: 'Execution loop step blocked',
          summary: 'A continuous execution loop step was blocked or failed verification.',
          content: JSON.stringify({ step: currentStep, execution }, null, 2),
          tags: ['execution-loop', 'blocked', 'change-set'],
          source: { kind: 'execution-loop', ref: currentStep.id || 'blocked-step' },
        });
        return {
          success: false,
          stage: 'execution',
          plan,
          iterations,
        };
      }

      if (execution.awaiting_observation || typeof options.observeStep !== 'function') {
        return {
          success: false,
          awaiting_observation: true,
          plan,
          iterations,
        };
      }

      const observed = await options.observeStep({
        attempt,
        step: currentStep,
        execution,
        plan,
      });
      const observation = analyzeObservation(observed || {}, {
        attempt,
        iterationLimit,
      });
      iterations[iterations.length - 1].observation = observation;
      emitControlTowerEvent('execution-loop-step', {
        changeSetId: currentStep.id,
        attempt,
        title: currentStep.title,
        status: observation.outcome,
      });

      if (observation.outcome === 'success') {
        completedStep = true;
        break;
      }

      if (!observation.should_continue) {
        await writeFailureMemory({
          title: 'Execution loop failed',
          summary: observation.reason,
          content: JSON.stringify({ plan, iterations }, null, 2),
          tags: ['execution-loop', 'failure', 'change-set'],
          source: { kind: 'execution-loop', ref: observation.outcome },
        });
        return {
          success: false,
          stage: 'observation',
          plan,
          iterations,
        };
      }

      currentStep = {
        ...currentStep,
        title: `${step.title} retry ${attempt + 1}`,
        description: `${step.description}\n\nAdjustment hint: ${observation.next_step_hint || 'refine the previous attempt based on observed output.'}`,
        changeSet: currentStep.changeSet
          ? {
              ...currentStep.changeSet,
              description: `${currentStep.changeSet.description}\n\nAdjustment hint: ${observation.next_step_hint || 'refine the previous attempt based on observed output.'}`,
            }
          : currentStep.changeSet,
      };
    }

    if (!completedStep) {
      await writeFailureMemory({
        title: 'Change set retry limit reached',
        summary: `Change set ${step.id || step.title || 'unknown'} exhausted its retry budget.`,
        content: JSON.stringify({ plan, iterations, step }, null, 2),
        tags: ['execution-loop', 'change-set', 'retry-limit'],
        source: { kind: 'execution-loop', ref: step.id || 'retry-limit' },
      });
      return {
        success: false,
        stage: 'limit',
        plan,
        iterations,
      };
    }
  }

  return {
    success: true,
    plan,
    iterations,
  };
}

export { runContinuousExecutionLoop };
