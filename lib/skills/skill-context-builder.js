function buildSkillContextBlock(skills = []) {
  if (!skills.length) return '';

  const lines = ['Relevant Engineering Skills'];

  for (const skill of skills) {
    lines.push(`Relevant skill: ${skill.name}`);
    if (skill.description) lines.push(`Description: ${skill.description}`);
    if (skill.trigger_conditions?.length) {
      lines.push(`Triggers: ${skill.trigger_conditions.join(', ')}`);
    }
    if (skill.recommended_steps?.length) {
      lines.push('Steps:');
      skill.recommended_steps.slice(0, 6).forEach((step, index) => {
        lines.push(`${index + 1}. ${step}`);
      });
    }
    lines.push(`Confidence: ${skill.confidence_score}`);
    lines.push('');
  }

  return lines.join('\n').trim();
}

export { buildSkillContextBlock };
