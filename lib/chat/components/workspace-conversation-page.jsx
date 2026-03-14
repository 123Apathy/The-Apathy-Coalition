'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getWorkspaceConversationDetail, sendWorkspaceConversationMessage } from '../actions.js';
import { PageLayout } from './page-layout.js';

export function WorkspaceConversationPage({ session, workspaceId, conversationId }) {
  const [state, setState] = useState(null);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const load = async () => {
    const detail = await getWorkspaceConversationDetail(workspaceId, conversationId);
    setState(detail);
  };

  useEffect(() => {
    load().catch(() => {});
  }, [workspaceId, conversationId]);

  const send = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSending(true);
    try {
      await sendWorkspaceConversationMessage(workspaceId, conversationId, message.trim());
      setMessage('');
      await load();
    } finally {
      setSending(false);
    }
  };

  if (!state) {
    return (
      <PageLayout session={session}>
        <div className="py-10 text-sm text-muted-foreground">Loading conversation…</div>
      </PageLayout>
    );
  }

  if (!state.conversation) {
    return (
      <PageLayout session={session}>
        <div className="py-10 text-sm text-muted-foreground">Conversation not found.</div>
      </PageLayout>
    );
  }

  return (
    <PageLayout session={session}>
      <div className="mx-auto flex h-full max-w-4xl flex-col gap-6">
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold">{state.conversation.title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                Inside <Link href={`/workspaces/${workspaceId}`} className="underline underline-offset-4">{state.workspace.name}</Link>
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <div className="space-y-3">
            {state.messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">No messages yet. Start the thread.</p>
            ) : state.messages.map((item) => (
              <div key={item.id} className="rounded-lg border border-border/70 px-4 py-3">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">{item.role}</div>
                <div className="mt-1 text-sm">{item.content}</div>
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={send} className="rounded-xl border border-border bg-card p-5">
          <div className="space-y-3">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              placeholder="Write to the shared workspace thread…"
            />
            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={sending}
                className="rounded-md bg-foreground px-3 py-2 text-sm font-medium text-background hover:bg-foreground/90 disabled:opacity-50"
              >
                {sending ? 'Sending…' : 'Send message'}
              </button>
              <span className="text-xs text-muted-foreground">
                Shared messages stay inside this workspace conversation.
              </span>
            </div>
          </div>
        </form>
      </div>
    </PageLayout>
  );
}
