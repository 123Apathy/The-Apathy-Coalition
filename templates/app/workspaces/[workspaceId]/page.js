import { auth } from 'thepopebot/auth';
import { WorkspaceDetailPage } from 'thepopebot/chat';

export default async function WorkspaceDetailRoute({ params }) {
  const { workspaceId } = await params;
  const session = await auth();
  return <WorkspaceDetailPage session={session} workspaceId={workspaceId} />;
}
