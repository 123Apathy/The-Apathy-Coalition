import { getControlTowerSnapshot } from '../../../../../../lib/control-tower/snapshot-service.js';

export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json(getControlTowerSnapshot(), {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
