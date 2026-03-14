function analyzeObservation(observation = {}, options = {}) {
  const status = String(observation.status || '').toLowerCase();
  const mergeResult = String(observation.merge_result || '').toLowerCase();
  const log = String(observation.log || '').toLowerCase();
  const attempt = options.attempt || 1;
  const iterationLimit = options.iterationLimit || 3;

  if (status.includes('success') || mergeResult.includes('merged') || mergeResult.includes('success')) {
    return {
      outcome: 'success',
      should_continue: false,
      reason: 'step completed successfully',
    };
  }

  const failureSignals = ['error', 'failed', 'exception', 'test failed', 'traceback'];
  const hasFailure = failureSignals.some((signal) => log.includes(signal) || status.includes(signal) || mergeResult.includes(signal));

  if (hasFailure && attempt < iterationLimit) {
    return {
      outcome: 'retry',
      should_continue: true,
      reason: 'step output indicates a recoverable failure',
      next_step_hint: 'address the observed test/runtime failure before continuing',
    };
  }

  return {
    outcome: hasFailure ? 'failed' : 'inconclusive',
    should_continue: false,
    reason: hasFailure ? 'failure threshold reached or unrecoverable error observed' : 'execution result was inconclusive',
  };
}

export { analyzeObservation };
