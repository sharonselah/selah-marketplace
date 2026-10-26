'use client';

import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, BadgeCheck, Banknote, Flag, Gavel, Gift, Landmark, Lock, Sparkles, TrendingUp, Wallet } from 'lucide-react';
import { PartyLink } from '@/components/admin/AdminUI';
import { Sparkline } from '@/components/admin/ReportCharts';
import { Card, CardHeader, IconCircle, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { kpis, periodReport, queueCounts, usersByRole, type RoleBucket } from '@/lib/admin';
import { TRANSACTION_TONE } from '@/lib/constants/labels';
import { formatKES, timeAgo } from '@/lib/format';
import { currentPolicy } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';

const ROLE_LABEL: Record<RoleBucket, string> = {
  PATRON: 'People (all)',
  ARTIST: 'Artists',
  CREATOR: 'Creators',
  VENUE: 'Venues',
  ORGANISER: 'Organisers',
  BRAND: 'Brands',
  BUSINESS: 'Other businesses',
};

export default function AdminOverviewPage() {
  const w = useWorld();
  const k = kpis(w);
  const roles = usersByRole(w);
  const q = queueCounts(w);
  const policy = currentPolicy(w);
  const weeks = periodReport(w, 'WEEK');
  const queues = [
    { href: '/admin/verification', label: 'Verifications waiting', n: q.verification, icon: BadgeCheck },
    { href: '/admin/disputes', label: 'Open disputes', n: q.disputes, icon: Gavel },
    { href: '/admin/payouts', label: 'Payouts to approve or run', n: q.payouts, icon: Banknote },
    { href: '/admin/flags', label: 'Reported content', n: q.flags, icon: Flag },
    { href: '/admin/earn', label: 'Rewards to moderate', n: q.earn, icon: Gift },
    { href: '/admin/creators', label: 'Creator tiers to recheck', n: q.creators, icon: Sparkles },
  ];

  return (
    <div>
      <PageHeader title="Overview" subtitle={`Platform health right now. Policy ${policy.version} in force.`} />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="GMV (funded)" value={formatKES(k.gmv, { compact: true })} icon={<TrendingUp className="size-4" />} hint="Paid into escrow · last 8 weeks">
          <Sparkline label="GMV" data={weeks.map((r) => ({ label: r.label, value: r.gmv }))} />
        </Stat>
        <Stat label="Escrow held" value={formatKES(k.held, { compact: true })} icon={<Lock className="size-4" />} hint={<Link href="/admin/balances" className="hover:text-brand">{k.heldCount} payments awaiting release · balances</Link>} />
        <Stat label="Payouts due" value={formatKES(k.payoutsDue, { compact: true })} icon={<Wallet className="size-4" />} hint={<Link href="/admin/payouts" className="hover:text-brand">{k.payoutsDueCount} sellers above the {formatKES(policy.minPayoutThreshold)} minimum · payouts</Link>} />
        <Stat label="Net revenue" value={formatKES(k.netRevenue, { compact: true })} icon={<Landmark className="size-4" />} hint={<Link href="/admin/reports" className="hover:text-brand">{formatKES(k.revenue, { compact: true })} fees − {formatKES(k.rewards, { compact: true })} rewards · reports</Link>}>
          <Sparkline label="Net revenue" data={weeks.map((r) => ({ label: r.label, value: r.net }))} />
        </Stat>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Needs attention" />
            <div className="flex flex-col gap-1">
              {queues.map(({ href, label, n, icon: Icon }) => (
                <Link key={href} href={href} className="flex items-center gap-3 py-2.5 text-sm hover:text-brand">
                  <IconCircle tone={n ? 'warn' : 'neutral'} icon={<Icon className="size-4" />} />
                  <span className="flex-1 text-text">{label}</span>
                  <span className="font-semibold text-text">{n}</span>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardHeader title="Recent activity" subtitle="Latest money movements across all accounts" action={<Link href="/admin/ledger" className="text-sm font-medium text-brand">Ledger</Link>} />
            <div className="flex flex-col gap-1">
              {w.transactions.slice(0, 10).map((t) => (
                <div key={t.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <IconCircle tone={t.direction === 'IN' ? 'good' : 'neutral'} icon={t.direction === 'IN' ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-text">{t.description}</div>
                    <div className="text-xs text-muted"><PartyLink world={w} party={t.party} className="font-normal text-muted" /> · {timeAgo(t.at)}</div>
                  </div>
                  <StatusPill status={t.status} tones={TRANSACTION_TONE} />
                  <Money amount={t.amount} className="w-24 text-right font-medium text-text" />
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card>
          <CardHeader title="Active users by role" subtitle="Roles overlap: an artist is also a person." />
          <div className="flex flex-col gap-1">
            {(Object.keys(ROLE_LABEL) as RoleBucket[]).map((r) => (
              <div key={r} className="flex justify-between py-2.5 text-sm">
                <span className="text-muted">{ROLE_LABEL[r]}</span>
                <span className="font-semibold text-text">{roles[r]}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
