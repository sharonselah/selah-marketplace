'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { ArrowLeftRight, BadgeCheck, Banknote, Bell, ChartColumn, Flag, Gavel, Gift, LayoutDashboard, Menu, Scale, Settings, Shapes, Sparkles, Users, X, type LucideIcon } from 'lucide-react';
import { queueCounts } from '@/lib/admin';
import { cn } from '@/lib/cn';
import { useWorld } from '@/lib/store/hooks';
import { Badge } from '@/components/ui/Display';
import { PrototypeControls, UserMenu } from './AppShell';
import { Logo } from './Logo';

type Count = keyof ReturnType<typeof queueCounts>;

type NavItem = { href: string; label: string; icon: LucideIcon; count?: Count };

/** Queues hold decisions someone is waiting on (most urgent first); records are for looking things up. */
const NAV: readonly { heading?: string; items: NavItem[] }[] = [
  { items: [{ href: '/admin', label: 'Overview', icon: LayoutDashboard }] },
  {
    heading: 'Review queues',
    items: [
      { href: '/admin/disputes', label: 'Disputes', icon: Gavel, count: 'disputes' },
      { href: '/admin/payouts', label: 'Payouts', icon: Banknote, count: 'payouts' },
      { href: '/admin/flags', label: 'Reported content', icon: Flag, count: 'flags' },
      { href: '/admin/verification', label: 'Verification', icon: BadgeCheck, count: 'verification' },
      { href: '/admin/earn', label: 'Earn moderation', icon: Gift, count: 'earn' },
      { href: '/admin/creators', label: 'Creator tiers', icon: Sparkles, count: 'creators' },
    ],
  },
  {
    heading: 'Records',
    items: [
      { href: '/admin/people', label: 'People & businesses', icon: Users },
      { href: '/admin/ledger', label: 'Ledger', icon: ArrowLeftRight },
      { href: '/admin/balances', label: 'Platform balances', icon: Scale },
      { href: '/admin/reports', label: 'Revenue reports', icon: ChartColumn },
      { href: '/admin/notifications', label: 'Notifications log', icon: Bell },
      { href: '/admin/states', label: 'State galleries', icon: Shapes },
    ],
  },
];

const isActive = (pathname: string, href: string) => (href === '/admin' ? pathname === href : pathname === href || pathname.startsWith(href + '/'));

function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const counts = queueCounts(useWorld());
  return (
    <nav className="flex flex-col gap-4">
      {NAV.map(({ heading, items }, i) => (
        <div key={heading ?? i} className="flex flex-col gap-0.5">
          {heading && <p className="px-3 pb-1 text-label text-muted uppercase">{heading}</p>}
          {items.map(({ href, label, icon: Icon, count }) => (
            <Link
              key={href}
              href={href}
              onClick={onNavigate}
              className={cn('flex items-center gap-3 rounded-tile px-3 py-2 text-sm font-medium transition', isActive(pathname, href) ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-text')}
            >
              <Icon className="size-4.5 shrink-0" />
              <span className="flex-1">{label}</span>
              {count && counts[count] > 0 && <Badge tone="warn">{counts[count]}</Badge>}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

/** Policy knobs are rarely touched, so they sit out of the main nav. */
function SettingsLink({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <Link
      href="/admin/policy"
      onClick={onNavigate}
      className={cn('flex items-center gap-2 px-3 text-xs font-medium transition', isActive(pathname, '/admin/policy') ? 'text-brand' : 'text-muted hover:text-text')}
    >
      <Settings className="size-3.5" />
      Settings
    </Link>
  );
}

function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <>
      <div className="px-3 text-xs text-muted">
        <div className="font-semibold text-text">Admin console</div>
        Every account and payment on the platform.
      </div>
      <AdminNav onNavigate={onNavigate} />
      <div className="mt-auto flex flex-col gap-3">
        <SettingsLink onNavigate={onNavigate} />
        <Link href="/home" onClick={onNavigate} className="rounded-full bg-surface-2 px-3 py-2 text-center text-sm font-medium text-text hover:bg-brand-soft">
          Browse the app as Selah Ops
        </Link>
        <PrototypeControls />
      </div>
    </>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [drawer, setDrawer] = useState(false);
  return (
    <div className="flex min-h-screen flex-1">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-5 overflow-y-auto bg-surface p-4 md:flex">
        <Logo href="/admin" />
        <Sidebar />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setDrawer(false)}>
          <aside className="flex h-full w-72 flex-col gap-5 overflow-y-auto bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setDrawer(false)} aria-label="Close menu">
                <X className="size-5 text-muted" />
              </button>
            </div>
            <Sidebar onNavigate={() => setDrawer(false)} />
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-bg/85 px-4 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu className="size-5 text-text" />
          </button>
          <div className="md:hidden">
            <Logo href="/admin" className="text-lg" />
          </div>
          <Badge tone="brand" className="ml-2 hidden md:inline-flex">Admin</Badge>
          <div className="ml-auto">
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-12 md:px-8">{children}</main>
      </div>
    </div>
  );
}
