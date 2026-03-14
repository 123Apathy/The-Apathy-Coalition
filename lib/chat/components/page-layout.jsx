'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppSidebar } from './app-sidebar.js';
import { SidebarProvider, SidebarInset, SidebarTrigger } from './ui/sidebar.js';
import { ChatNavProvider } from './chat-nav-context.js';
import { NotificationsPopover } from './notifications-popover.js';

export function PageLayout({ session, children, contentClassName }) {
  const router = useRouter();

  useEffect(() => {
    [
      '/',
      '/chats',
      '/workspaces',
      '/settings',
      '/settings/personalization',
      '/settings/memory',
      '/settings/models',
      '/settings/notifications',
      '/settings/appearance',
      '/manual',
      '/runners',
      '/clusters',
      '/pull-requests',
    ].forEach((href) => router.prefetch(href));
  }, [router]);

  const navigateToChat = (id) => {
    router.push(id ? `/chat/${id}` : '/');
  };

  return (
    <ChatNavProvider value={{ activeChatId: null, navigateToChat }}>
      <SidebarProvider>
        <AppSidebar user={session.user} />
        <SidebarInset>
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-border/60 bg-background/95 px-2 py-1.5 backdrop-blur">
            <div className="md:hidden">
              <SidebarTrigger />
            </div>
            <div className="hidden md:block" />
            <NotificationsPopover />
          </div>
          <div className={contentClassName || "flex flex-col h-full max-w-4xl mx-auto w-full min-w-0 px-4 py-6"}>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ChatNavProvider>
  );
}
