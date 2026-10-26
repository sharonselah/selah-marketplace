'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Bell, Check, ChevronsUpDown, FlaskConical, LogOut, Menu, Mic2, Plus, RotateCcw, Settings, Shield, User, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { PANEL, type PanelId } from '@/lib/constants/panels';
import { BUSINESS_LABEL_TEXT, byId, displayLabel, getPanels, personLabel, samePartyRef, unreadCount } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import { logout, switchAccount } from '@/lib/store/actions/auth';
import { resetPrototype } from '@/lib/store/store';
import { Avatar } from '@/components/ui/Display';
import { toast } from '@/components/ui/Toast';
import { Logo } from './Logo';
import { PANEL_ICON } from './icons';

function isActive(pathname: string, href: string) {
  if (href === '/home' || href === '/biz' || href === '/artist' || href === '/creator') return pathname === href;
  return pathname === href || pathname.startsWith(href + '/');
}

/** The most specific matching panel wins, so /biz/ads/campaigns lights up "Ad campaigns", not "Ad marketplace". */
function activeHref(pathname: string, panels: PanelId[]) {
  return panels.map((id) => PANEL[id].href as string).filter((h) => isActive(pathname, h)).sort((a, b) => b.length - a.length)[0];
}

function NavList({ panels, onNavigate }: { panels: PanelId[]; onNavigate?: () => void }) {
  const pathname = usePathname();
  const current = activeHref(pathname, panels);
  return (
    <nav className="flex flex-col gap-0.5">
      {panels.map((id) => {
        const p = PANEL[id];
        const Icon = PANEL_ICON[p.icon];
        const active = p.href === current;
        return (
          <Link
            key={id}
            href={p.href}
            onClick={onNavigate}
            className={cn('flex items-center gap-3 rounded-tile px-3 py-2 text-sm font-medium transition', active ? 'bg-brand-soft text-brand' : 'text-muted hover:bg-surface-2 hover:text-text')}
          >
            <Icon className="size-4.5 shrink-0" />
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}

function AccountSwitcher() {
  const { world, me, actingAs } = useViewer();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const accounts = [
    { ref: { kind: 'PERSON', id: me.id } as const, name: me.artist?.stageName ?? me.name, label: personLabel(me), icon: <Avatar name={me.name} size="sm" /> },
    ...me.businessIds.flatMap((id) => {
      const b = byId(world.businesses, id);
      return b ? [{ ref: { kind: 'BUSINESS', id } as const, name: b.name, label: BUSINESS_LABEL_TEXT[displayLabel(b)], icon: <Avatar name={b.name} size="sm" /> }] : [];
    }),
  ];
  const current = accounts.find((a) => samePartyRef(a.ref, actingAs)) ?? accounts[0];

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-3 rounded-tile bg-surface-2 p-2 text-left hover:bg-brand-soft">
        {current.icon}
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="truncate text-sm font-semibold text-text">{current.name}</span>
          <span className="truncate text-xs text-muted">Acting as · {current.label}</span>
        </span>
        <ChevronsUpDown className="size-4 text-muted" />
      </button>
      {open && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 rounded-tile bg-surface p-1 shadow-float">
          {accounts.map((a) => (
            <button
              key={a.ref.id}
              onClick={() => {
                switchAccount(a.ref);
                setOpen(false);
                router.push(a.ref.kind === 'BUSINESS' ? '/biz' : '/home');
              }}
              className="flex w-full items-center gap-3 rounded-tile p-2 text-left hover:bg-surface-2"
            >
              {a.icon}
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium text-text">{a.name}</span>
                <span className="text-xs text-muted">{a.label}</span>
              </span>
              {samePartyRef(a.ref, actingAs) && <Check className="size-4 text-brand" />}
            </button>
          ))}
          <div className="my-1 border-t border-border" />
          {!me.artist && (
            <Link href="/onboarding/artist" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-tile p-2 text-sm text-text hover:bg-surface-2">
              <Mic2 className="size-4 text-brand" /> Add Artist role
            </Link>
          )}
          <Link href="/onboarding/business" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-tile p-2 text-sm text-text hover:bg-surface-2">
            <Plus className="size-4 text-brand" /> Add Business Account
          </Link>
        </div>
      )}
    </div>
  );
}

export function PrototypeControls() {
  const router = useRouter();
  return (
    <div className="rounded-tile bg-surface-2 p-3 text-xs text-muted">
      <div className="mb-2 flex items-center gap-1.5 font-medium text-text">
        <FlaskConical className="size-3.5 text-accent" /> Prototype
      </div>
      <p className="mb-2">No real money moves. Data is saved in this browser only.</p>
      <button
        onClick={() => {
          if (!confirm('Reset the prototype? All accounts you created and actions you took will be wiped.')) return;
          resetPrototype();
          router.replace('/');
        }}
        className="flex items-center gap-1.5 font-medium text-bad hover:underline"
      >
        <RotateCcw className="size-3.5" /> Reset prototype
      </button>
    </div>
  );
}

export function UserMenu() {
  const { me } = useViewer();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} aria-label="Account menu" className="rounded-full">
        <Avatar name={me.name} size="sm" verified={me.verification !== 'PHONE_VERIFIED'} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-2 w-56 rounded-tile bg-surface p-1 shadow-float" onMouseLeave={() => setOpen(false)}>
          <div className="px-3 py-2">
            <div className="truncate text-sm font-semibold text-text">{me.name}</div>
            <div className="truncate text-xs text-muted">{me.phone}</div>
          </div>
          <div className="my-1 border-t border-border" />
          <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-tile px-3 py-2 text-sm text-text hover:bg-surface-2">
            <Settings className="size-4" /> Settings
          </Link>
          {me.artist && (
            <Link href={`/artists/${me.artist.id}`} onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-tile px-3 py-2 text-sm text-text hover:bg-surface-2">
              <User className="size-4" /> Public profile
            </Link>
          )}
          {me.isAdmin && (
            <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2 rounded-tile px-3 py-2 text-sm text-text hover:bg-surface-2">
              <Shield className="size-4" /> Admin console
            </Link>
          )}
          <button
            onClick={() => {
              logout();
              toast('You’ve been logged out', 'info');
              router.replace('/login');
            }}
            className="flex w-full items-center gap-2 rounded-tile px-3 py-2 text-sm text-bad hover:bg-surface-2"
          >
            <LogOut className="size-4" /> Log out
          </button>
        </div>
      )}
    </div>
  );
}

function NotificationBell() {
  const { world, actingAs } = useViewer();
  const count = unreadCount(world, actingAs);
  return (
    <Link href="/notifications" className="relative rounded-full p-2 text-muted hover:bg-surface-2 hover:text-text" aria-label="Notifications">
      <Bell className="size-5" />
      {count > 0 && <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-bad text-[10px] font-bold text-white">{count}</span>}
    </Link>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { world, session } = useViewer();
  const panels = getPanels(world, session);
  const [drawer, setDrawer] = useState(false);
  const pathname = usePathname();
  const mobileTabs = panels.slice(0, 4);

  return (
    <div className="flex min-h-screen flex-1">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-5 overflow-y-auto bg-surface p-4 md:flex">
        <Logo href="/home" />
        <AccountSwitcher />
        <NavList panels={panels} />
        <div className="mt-auto">
          <PrototypeControls />
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="fixed inset-0 z-50 bg-black/40 md:hidden" onClick={() => setDrawer(false)}>
          <aside className="flex h-full w-72 flex-col gap-5 overflow-y-auto bg-surface p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <Logo />
              <button onClick={() => setDrawer(false)} aria-label="Close menu">
                <X className="size-5 text-muted" />
              </button>
            </div>
            <AccountSwitcher />
            <NavList panels={panels} onNavigate={() => setDrawer(false)} />
            <div className="mt-auto">
              <PrototypeControls />
            </div>
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 bg-bg/85 px-4 backdrop-blur md:px-8">
          <button className="md:hidden" onClick={() => setDrawer(true)} aria-label="Open menu">
            <Menu className="size-5 text-text" />
          </button>
          <div className="md:hidden">
            <Logo href="/home" className="text-lg" />
          </div>
          <div className="ml-auto flex items-center gap-1">
            <NotificationBell />
            <UserMenu />
          </div>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 md:px-8 md:pb-12">{children}</main>
      </div>

      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex rounded-t-card bg-surface px-2 pt-2 pb-3 shadow-float md:hidden">
        {mobileTabs.map((id) => {
          const p = PANEL[id];
          const Icon = PANEL_ICON[p.icon];
          const active = p.href === activeHref(pathname, panels);
          return (
            <Link key={id} href={p.href} className={cn('flex flex-1 flex-col items-center gap-1 text-[11px]', active ? 'font-medium text-brand' : 'text-muted')}>
              {/* Active tab: the icon sits in a soft brand pill; the icon itself never changes. */}
              <span className={cn('flex h-8 w-14 items-center justify-center rounded-full transition', active && 'bg-brand-soft')}>
                <Icon className="size-5" />
              </span>
              {p.label.replace(/^My /, '').split(' ')[0]}
            </Link>
          );
        })}
        <button onClick={() => setDrawer(true)} className="flex flex-1 flex-col items-center gap-1 text-[11px] text-muted">
          <span className="flex h-8 w-14 items-center justify-center">
            <Menu className="size-5" />
          </span>
          More
        </button>
      </nav>
    </div>
  );
}
