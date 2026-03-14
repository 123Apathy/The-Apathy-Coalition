import { notFound } from 'next/navigation';
import { getControlTowerSnapshot } from '../../../../../lib/control-tower/snapshot-service.js';
import { DashboardClient } from '../../../components/dashboard-client.jsx';

export const dynamic = 'force-dynamic';

const SECTIONS = new Set([
  'system-status',
  'tasks',
  'change-sets',
  'repository',
  'memory',
  'teams',
]);

export default async function ControlTowerSectionPage({ params }) {
  const { section } = await params;
  if (!SECTIONS.has(section)) {
    notFound();
  }

  const snapshot = getControlTowerSnapshot();
  return <DashboardClient section={section} initialSnapshot={snapshot} />;
}
