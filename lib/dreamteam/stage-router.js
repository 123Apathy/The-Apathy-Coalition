import { loadExpertModules } from './expert-loader.js';

const Stage1Experts = [
  'product-strategist',
  'client-experience-reviewer',
  'ux-researcher',
  'human-behavioural-scientist',
];

const Stage2Experts = [
  'backend-architect',
  'code-quality-expert',
  'ai-expert',
  'qa-automation',
  'devops-sre',
];

const Stage3Experts = [
  'security',
  'risk-governance',
  'legal-compliance',
  'billing',
];

const Stage4Experts = [
  'analytics',
  'presentation-storytelling',
  'email-copy-expert',
  'trust-signals',
];

function getStageDomains(stage) {
  switch (stage) {
    case 1: return Stage1Experts;
    case 2: return Stage2Experts;
    case 3: return Stage3Experts;
    case 4: return Stage4Experts;
    default: return [];
  }
}

function getExpertsForStage(stage) {
  const domains = new Set(getStageDomains(stage));
  return loadExpertModules().filter((expert) => domains.has(expert.domain));
}

export { Stage1Experts, Stage2Experts, Stage3Experts, Stage4Experts, getExpertsForStage };
