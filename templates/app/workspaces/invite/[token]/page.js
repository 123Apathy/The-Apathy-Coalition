import { auth } from 'thepopebot/auth';
import { WorkspaceInvitePage } from 'thepopebot/chat';

export default async function WorkspaceInviteRoute({ params }) {
  const { token } = await params;
  const session = await auth();
  return <WorkspaceInvitePage session={session} token={token} />;
}
