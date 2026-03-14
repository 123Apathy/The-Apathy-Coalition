import { auth } from 'thepopebot/auth';
import { WorkspacesPage } from 'thepopebot/chat';

export default async function WorkspacesRoute() {
  const session = await auth();
  return <WorkspacesPage session={session} />;
}
