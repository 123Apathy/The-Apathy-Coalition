import { auth } from 'thepopebot/auth';
import { WorkspaceConversationPage } from 'thepopebot/chat';

export default async function WorkspaceConversationRoute({ params }) {
  const { workspaceId, conversationId } = await params;
  const session = await auth();
  return <WorkspaceConversationPage session={session} workspaceId={workspaceId} conversationId={conversationId} />;
}
