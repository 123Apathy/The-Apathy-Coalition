import { MODEL_REGISTRY } from '../ai/model-registry.js';
import { createJob } from './create-job.js';

function buildRepoSelfImprovementPrompt(customFocus = '') {
  const trimmedFocus = customFocus?.trim();
  const focusSection = trimmedFocus
    ? `\nAdditional focus from the user:\n- ${trimmedFocus}\n`
    : '';

  return `Analyze this repository and make one small, safe self-improvement change.

Goals:
- Read the repository contents
- Understand the current architecture and code quality
- Identify one worthwhile improvement opportunity
- Generate and apply a small patch
- Leave the result as a pull request for review

Prioritize:
- Removing dead code
- Simplifying complex functions
- Improving naming clarity
- Adding missing documentation
- Fixing obvious bugs

Safety rules:
- Never modify the main branch directly
- Work only inside this job branch
- Keep the patch size small and safe
- Prefer one focused improvement over broad refactors
- Avoid risky migrations, dependency churn, or large architectural changes
- Assume the resulting pull request should be reviewed before merge

Execution plan:
1. Inspect the repository structure and key files
2. Choose the single best small improvement
3. Implement the change
4. Add concise documentation or comments only if they materially help reviewers
5. Prepare the repository for a normal PR review${focusSection}`.trim();
}

async function createRepoSelfImprovementJob(options = {}) {
  return createJob(buildRepoSelfImprovementPrompt(options.focus), {
    ...options,
    jobType: 'repo_self_improvement',
    llmModel: options.llmModel || MODEL_REGISTRY.coding,
  });
}

export { buildRepoSelfImprovementPrompt, createRepoSelfImprovementJob };
