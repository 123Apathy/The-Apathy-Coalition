'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PageLayout } from './page-layout.js';
import { ClockIcon, ZapIcon, KeyIcon, BellIcon, MessageIcon, SettingsIcon, StarIcon, SunIcon, RunnersIcon } from './icons.js';

const TABS = [
  { id: 'personalization', label: 'Personalization', href: '/settings/personalization', icon: StarIcon },
  { id: 'memory', label: 'Memory', href: '/settings/memory', icon: SettingsIcon },
  { id: 'models', label: 'Models', href: '/settings/models', icon: MessageIcon },
  { id: 'notifications', label: 'Notifications', href: '/settings/notifications', icon: BellIcon },
  { id: 'appearance', label: 'Appearance', href: '/settings/appearance', icon: SunIcon },
  { id: 'system', label: 'System', href: '/settings/system', icon: RunnersIcon },
  { id: 'crons', label: 'Crons', href: '/settings/crons', icon: ClockIcon },
  { id: 'triggers', label: 'Triggers', href: '/settings/triggers', icon: ZapIcon },
  { id: 'secrets', label: 'Secrets', href: '/settings/secrets', icon: KeyIcon },
];

export function SettingsLayout({ session, children }) {
  const activePath = usePathname() || '';

  return (
    <PageLayout session={session}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
      </div>

      {/* Tab navigation */}
      <div className="flex gap-1 border-b border-border mb-6 overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activePath === tab.href || activePath.startsWith(tab.href + '/');
          const Icon = tab.icon;
          return (
            <Link
              key={tab.id}
              href={tab.href}
              prefetch
              className={`inline-flex items-center gap-2 px-3 py-2 min-h-[44px] shrink-0 text-sm font-medium border-b-2 transition-colors ${
                isActive
                  ? 'border-foreground text-foreground'
                  : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
              }`}
            >
              <Icon size={14} />
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Tab content */}
      {children}
    </PageLayout>
  );
}
