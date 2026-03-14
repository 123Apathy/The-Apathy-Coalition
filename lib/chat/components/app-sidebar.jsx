'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CirclePlusIcon, PanelLeftIcon, MessageIcon, ClusterIcon, RunnersIcon, ArrowUpCircleIcon, LifeBuoyIcon, GitPullRequestIcon, UserIcon } from './icons.js';
import { getPullRequestCount, getAppVersion } from '../actions.js';
import { ApathyLogo } from './apathy-logo.js';
import { SidebarHistory } from './sidebar-history.js';
import { SidebarUserNav } from './sidebar-user-nav.js';
import { UpgradeDialog } from './upgrade-dialog.js';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from './ui/sidebar.js';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.js';
import { useChatNav } from './chat-nav-context.js';

export function AppSidebar({ user }) {
  const router = useRouter();
  const pathname = usePathname() || '';
  const { navigateToChat } = useChatNav();
  const { setOpenMobile, toggleSidebar, state } = useSidebar();
  const collapsed = state === 'collapsed';
  const controlTowerHref = typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3010/dashboard/system-status`
    : 'http://localhost:3010/dashboard/system-status';
  const [prCount, setPrCount] = useState(0);
  const [version, setVersion] = useState('');
  const [updateAvailable, setUpdateAvailable] = useState(null);
  const [changelog, setChangelog] = useState(null);
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    function fetchCounts() {
      getPullRequestCount()
        .then((count) => setPrCount(count))
        .catch(() => {});
    }

    fetchCounts();
    const interval = setInterval(fetchCounts, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const navigate = (href) => {
    router.push(href);
    setOpenMobile(false);
  };

  useEffect(() => {
    getAppVersion()
      .then(({ version, updateAvailable, changelog }) => {
        setVersion(version);
        setUpdateAvailable(updateAvailable);
        setChangelog(changelog);
      })
      .catch(() => {});
  }, []);

  return (
    <>
      <Sidebar>
        <SidebarHeader>
          <div className={collapsed ? 'flex justify-center' : 'flex items-start justify-between gap-3'}>
            {!collapsed && (
              <div className="flex items-center gap-3 px-2">
                <ApathyLogo className="h-12 w-11 shrink-0" />
                <div className="min-w-0">
                  <div className="font-semibold text-lg leading-none">The Apathy Coalition</div>
                </div>
              </div>
            )}
            {collapsed && <ApathyLogo className="h-11 w-10" />}
            <button
              className="inline-flex shrink-0 items-center justify-center rounded-md p-2 text-muted-foreground hover:bg-background hover:text-foreground"
              onClick={toggleSidebar}
              aria-label="Toggle sidebar"
            >
              <PanelLeftIcon size={16} />
            </button>
          </div>

          <SidebarMenu>
            <SidebarMenuItem className="mb-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <SidebarMenuButton
                    href="/"
                    isActive={pathname === '/'}
                    className={collapsed ? 'justify-center' : ''}
                    onClick={(e) => {
                      e.preventDefault();
                      navigateToChat(null);
                      setOpenMobile(false);
                    }}
                  >
                    <CirclePlusIcon size={16} />
                    {!collapsed && <span>New chat</span>}
                  </SidebarMenuButton>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right">New chat</TooltipContent>}
              </Tooltip>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarHeader>

        {!collapsed && (
          <SidebarContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      href="/workspaces"
                      isActive={pathname === '/workspaces'}
                      className={collapsed ? 'justify-center' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/workspaces');
                      }}
                    >
                      <UserIcon size={16} />
                      {!collapsed && <span>Workspaces</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Workspaces</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      href="/chats"
                      isActive={pathname === '/chats'}
                      className={collapsed ? 'justify-center' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/chats');
                      }}
                    >
                      <MessageIcon size={16} />
                      {!collapsed && <span>Chats</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Chats</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      href="/clusters"
                      isActive={pathname === '/clusters' || pathname.startsWith('/cluster/')}
                      className={collapsed ? 'justify-center' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/clusters');
                      }}
                    >
                      <ClusterIcon size={16} />
                      {!collapsed && <span>Clusters</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Clusters</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      href="/runners"
                      isActive={pathname === '/runners'}
                      className={collapsed ? 'justify-center' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/runners');
                      }}
                    >
                      <RunnersIcon size={16} />
                      {!collapsed && <span>Runners</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Runners</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      href="/pull-requests"
                      isActive={pathname === '/pull-requests'}
                      className={collapsed ? 'justify-center' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/pull-requests');
                      }}
                    >
                      <GitPullRequestIcon size={16} />
                      {!collapsed && (
                        <span className="flex items-center gap-2">
                          Approvals
                          {prCount > 0 && (
                            <span className="inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium leading-none text-destructive-foreground">
                              {prCount}
                            </span>
                          )}
                        </span>
                      )}
                      {collapsed && prCount > 0 && (
                        <span className="absolute -top-1 -right-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-medium text-destructive-foreground">
                          {prCount}
                        </span>
                      )}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Approvals</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>

              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      href={controlTowerHref}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={collapsed ? 'justify-center' : ''}
                    >
                      <RunnersIcon size={16} />
                      {!collapsed && <span>Control Tower</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Control Tower</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>

              {updateAvailable && (
                <SidebarMenuItem>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton
                        className={collapsed ? 'justify-center' : ''}
                        onClick={() => setUpgradeOpen(true)}
                      >
                        <span className="relative">
                          <ArrowUpCircleIcon size={16} />
                          {collapsed && (
                            <span className="absolute -top-1 -right-1 inline-block h-2 w-2 rounded-full bg-emerald-500" />
                          )}
                        </span>
                        {!collapsed && (
                          <span className="flex items-center gap-2">
                            Upgrade
                            <span className="inline-flex items-center justify-center rounded-full bg-emerald-500 px-1.5 py-0.5 text-[10px] font-medium leading-none text-white">
                              v{updateAvailable}
                            </span>
                          </span>
                        )}
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right">Upgrade to v{updateAvailable}</TooltipContent>
                    )}
                  </Tooltip>
                </SidebarMenuItem>
              )}

              <SidebarMenuItem>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <SidebarMenuButton
                      href="/manual"
                      isActive={pathname === '/manual'}
                      className={collapsed ? 'justify-center' : ''}
                      onClick={(e) => {
                        e.preventDefault();
                        navigate('/manual');
                      }}
                    >
                      <LifeBuoyIcon size={16} />
                      {!collapsed && <span>Manual</span>}
                    </SidebarMenuButton>
                  </TooltipTrigger>
                  {collapsed && <TooltipContent side="right">Manual</TooltipContent>}
                </Tooltip>
              </SidebarMenuItem>
            </SidebarMenu>

            <div className="mx-4 border-t border-border" />
            <SidebarHistory />
          </SidebarContent>
        )}

        {collapsed && <div className="flex-1" />}

        <SidebarFooter>
          {user && <SidebarUserNav user={user} collapsed={collapsed} version={version} />}
        </SidebarFooter>
      </Sidebar>
      <UpgradeDialog
        open={upgradeOpen}
        onClose={() => setUpgradeOpen(false)}
        version={version}
        updateAvailable={updateAvailable}
        changelog={changelog}
      />
    </>
  );
}
