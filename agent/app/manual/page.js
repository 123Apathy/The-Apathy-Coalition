import { auth } from 'thepopebot/auth';
import { ManualPage } from 'thepopebot/chat';

export default async function ManualRoute() {
  const session = await auth();
  return <ManualPage session={session} />;
}
