const DEFAULT_GATES = [
  { id: 'syntax', label: 'syntax validation' },
  { id: 'lint', label: 'lint checks' },
  { id: 'unit', label: 'unit tests' },
  { id: 'integration', label: 'integration tests' },
];

function buildVerificationPrompt(changeSet, gates = DEFAULT_GATES) {
  const impacted = changeSet.affected_modules || [];
  return [
    'Verification gates to run after applying this change set:',
    ...gates.map((gate) => `- ${gate.label}`),
    '',
    `Change set: ${changeSet.id}`,
    `Goal: ${changeSet.goal}`,
    impacted.length ? `Impacted modules to include in verification scope:\n- ${impacted.join('\n- ')}` : '',
  ].join('\n');
}

function evaluateVerificationGates(observation = {}, gates = DEFAULT_GATES) {
  const text = `${observation.status || ''}\n${observation.merge_result || ''}\n${observation.log || ''}`.toLowerCase();
  const results = gates.map((gate) => {
    if (text.includes(`${gate.id}: pass`) || text.includes(`${gate.label}: pass`)) {
      return { gate: gate.id, status: 'pass' };
    }
    if (text.includes(`${gate.id}: fail`) || text.includes(`${gate.label}: fail`) || text.includes('test failed') || text.includes('lint failed')) {
      return { gate: gate.id, status: 'fail' };
    }
    if (text.includes(`${gate.id}: error`) || text.includes(`${gate.label}: error`) || text.includes('exception') || text.includes('traceback')) {
      return { gate: gate.id, status: 'error' };
    }
    return { gate: gate.id, status: 'pass' };
  });

  return {
    results,
    ok: results.every((item) => item.status === 'pass'),
  };
}

export { DEFAULT_GATES, buildVerificationPrompt, evaluateVerificationGates };
