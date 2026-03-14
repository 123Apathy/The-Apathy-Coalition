import { loadExpertModules } from '../dreamteam/expert-loader.js';
import { Stage1Experts, Stage2Experts, Stage3Experts, Stage4Experts } from '../dreamteam/stage-router.js';
import { listMemoryDocuments } from '../memory/memory-store.js';
import { getRecentControlTowerEvents } from './event-bus.js';

const DEPARTMENTS = [
  { id: 'product', name: 'Product & Human Impact', experts: Stage1Experts },
  { id: 'engineering', name: 'Engineering & Architecture', experts: Stage2Experts },
  { id: 'risk', name: 'Risk / Security / Compliance', experts: Stage3Experts },
  { id: 'growth', name: 'Growth & Communication', experts: Stage4Experts },
];

function buildOrganizationSnapshot() {
  const experts = loadExpertModules();
  const participationDocs = listMemoryDocuments('expert-learnings');
  const decisions = getRecentControlTowerEvents(200).filter((event) => event.type === 'dreamteam-decision');

  const participation = {};
  for (const doc of participationDocs) {
    const key = doc.source?.ref || 'unknown';
    participation[key] = (participation[key] || 0) + 1;
  }

  const teams = DEPARTMENTS.map((department) => {
    const departmentExperts = experts.filter((expert) => department.experts.includes(expert.domain));
    const relevantDecisions = decisions.filter((event) =>
      (event.payload.stageDomains || []).some((domain) => department.experts.includes(domain))
    );
    const approvals = relevantDecisions.filter((event) => String(event.payload.decision).startsWith('APPROVE')).length;

    return {
      id: department.id,
      name: department.name,
      expertCount: departmentExperts.length,
      experts: departmentExperts.map((expert) => ({
        ...expert,
        participation: participation[expert.domain] || 0,
      })),
      performance: {
        reviews: relevantDecisions.length,
        approvals,
        approvalRate: relevantDecisions.length ? Number((approvals / relevantDecisions.length).toFixed(2)) : 0,
      },
    };
  });

  return {
    departments: DEPARTMENTS.map((department) => ({
      id: department.id,
      name: department.name,
      teamSize: department.experts.length,
    })),
    teams,
    expertParticipation: teams.flatMap((team) => team.experts),
  };
}

export { buildOrganizationSnapshot };
