'use client';

import { useEffect, useMemo, useState } from 'react';
import { Streamdown } from 'streamdown';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from './ui/dropdown-menu.js';
import { BellIcon, SpinnerIcon } from './icons.js';
import { getNotifications, getUnreadNotificationCount, markNotificationsRead } from '../actions.js';
import { linkSafety } from './message.js';

const PREVIEW_COUNT = 8;

function timeAgo(ts) {
  const date = typeof ts === 'number' ? ts : new Date(ts).getTime();
  const seconds = Math.floor((Date.now() - date) / 1000);
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

export function NotificationsPopover() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [hasMore, setHasMore] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const hasNotifications = notifications.length > 0;

  const loadUnreadCount = async () => {
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
    }
  };

  useEffect(() => {
    loadUnreadCount();
    const interval = setInterval(loadUnreadCount, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;

    async function loadPanel() {
      setLoading(true);
      try {
        const result = await getNotifications(PREVIEW_COUNT, 0);
        if (!cancelled) {
          setNotifications(result.notifications || []);
          setHasMore(!!result.hasMore);
          setUnreadCount(0);
        }
        await markNotificationsRead();
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to load notifications popover:', error);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadPanel();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const badgeText = useMemo(() => {
    if (unreadCount <= 0) return null;
    return unreadCount > 99 ? '99+' : unreadCount;
  }, [unreadCount]);

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          aria-label="Notifications"
          title="Notifications"
        >
          <BellIcon size={18} />
          {badgeText && (
            <span className="absolute right-1 top-1 inline-flex min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-medium leading-none text-destructive-foreground">
              {badgeText}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-[24rem] max-w-[calc(100vw-2rem)] p-0">
        <div className="border-b border-border px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              <p className="text-xs text-muted-foreground">
                {hasNotifications ? 'Recent updates without leaving your current screen.' : 'You are all caught up.'}
              </p>
            </div>
            {loading && <SpinnerIcon size={14} />}
          </div>
        </div>

        <div className="max-h-[24rem] overflow-y-auto">
          {loading ? (
            <div className="flex flex-col gap-3 p-4">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="h-16 animate-pulse rounded-md bg-border/50" />
              ))}
            </div>
          ) : !hasNotifications ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {notifications.map((notification) => (
                <div key={notification.id} className="px-4 py-3">
                  <div className="prose prose-sm max-w-none overflow-hidden text-sm text-foreground">
                    <Streamdown mode="static" linkSafety={linkSafety}>
                      {notification.notification}
                    </Streamdown>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {timeAgo(notification.createdAt)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {(hasNotifications || hasMore) && (
          <div className="border-t border-border px-4 py-3">
            <a
              href="/notifications"
              className="text-sm font-medium text-primary transition-colors hover:text-primary/80"
            >
              Open full notifications page
            </a>
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
