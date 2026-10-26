'use client';

import { useState } from 'react';
import { Send } from 'lucide-react';
import { ExportButton } from '@/components/shared/ExportButton';
import { PayoutModal } from '@/components/shared/WalletModals';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, CardHeader, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { ESCROW_LABEL, ESCROW_TONE, PAYOUT_METHOD_LABEL, TRANSACTION_TONE, payoutStatusLabel } from '@/lib/constants/labels';
import { formatDate, formatKES } from '@/lib/format';
import { byId, currentPolicy, heldFor, partyName, payeeShare, personRef, samePartyRef } from '@/lib/selectors';
import { fileSlug, statementRows, today } from '@/lib/csv';
import { useViewer } from '@/lib/store/hooks';
import type { Minor } from '@/types';
import { PayMark } from '@/components/ui/Visuals';

export default function EarningsPage() {
  const { world, me } = useViewer();
  const artist = me.artist!;
  const ref = personRef(me.id);
  const [payout, setPayout] = useState(false);

  const escrows = world.escrows.filter((e) => samePartyRef(e.payee, ref) && e.state !== 'AWAITING_FUNDS').sort((a, b) => (b.heldAt ?? '').localeCompare(a.heldAt ?? ''));
  const released = escrows.filter((e) => e.state === 'RELEASED').reduce((a, e) => a + payeeShare(e), 0) as Minor;
  const held = heldFor(world, ref);
  const payouts = world.payouts.filter((p) => samePartyRef(p.party, ref));
  const policy = currentPolicy(world);

  // Last 6 months of released earnings for a simple bar chart.
  const months = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i), 1);
    return { key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleDateString('en-KE', { month: 'short' }) };
  });
  const byMonth = months.map((m) => ({
    ...m,
    value: world.transactions
      .filter((t) => samePartyRef(t.party, ref) && t.direction === 'IN' && t.description.startsWith('Released'))
      .filter((t) => { const d = new Date(t.at); return `${d.getFullYear()}-${d.getMonth()}` === m.key; })
      .reduce((a, t) => a + t.amount, 0),
  }));
  const peak = Math.max(1, ...byMonth.map((m) => m.value));

  // Top requesters: who has paid this artist the most.
  const totals = new Map<string, { name: string; amount: number; count: number }>();
  for (const e of escrows) {
    const key = `${e.payer.kind}:${e.payer.id}`;
    const cur = totals.get(key) ?? { name: partyName(world, e.payer), amount: 0, count: 0 };
    cur.amount += e.amount;
    cur.count += 1;
    totals.set(key, cur);
  }
  const top = [...totals.values()].sort((a, b) => b.amount - a.amount).slice(0, 5);
  const views = 1200 + artist.gigsPlayed * 37;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Earnings & analytics" action={
          <div className="flex flex-wrap gap-2">
            <ExportButton filename={`${fileSlug(world, ref)}-statement-${today()}`} build={() => statementRows(world, ref)} label="Statement" />
            <Button icon={<Send className="size-4" />} onClick={() => setPayout(true)} disabled={me.wallet.balance <= 0}>Withdraw</Button>
          </div>
        } />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Available to withdraw" value={<Money amount={me.wallet.balance} />} hint={`Min. payout ${formatKES(policy.minPayoutThreshold)}`} />
        <Stat label="Held in escrow" value={<Money amount={held} />} hint="Released after fulfilment" />
        <Stat label="Released (all time)" value={<Money amount={released} />} />
        <Stat label="Profile views (30d)" value={views.toLocaleString()} hint={`${world.bookingRequests.filter((r) => r.artistId === artist.id).length} booking requests`} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card>
          <CardHeader title="Released earnings" subtitle="Last 6 months" />
          <div className="flex h-44 items-end gap-3">
            {byMonth.map((m) => (
              <div key={m.key} className="flex flex-1 flex-col items-center gap-1.5">
                <div className="text-[10px] text-muted">{m.value ? formatKES(m.value as Minor, { compact: true }).replace('KES ', '') : ''}</div>
                <div className="w-full rounded-t-lg bg-brand" style={{ height: `${Math.max(4, (m.value / peak) * 120)}px`, opacity: m.value ? 1 : 0.2 }} />
                <div className="text-xs text-muted">{m.label}</div>
              </div>
            ))}
          </div>
        </Card>
        <Card>
          <CardHeader title="Top bookers & buyers" />
          {top.length === 0 ? <p className="text-sm text-muted">No sales yet.</p> : (
            <div className="flex flex-col gap-3">
              {top.map((t) => (
                <div key={t.name} className="flex items-center gap-3">
                  <Avatar name={t.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-text">{t.name}</div>
                    <div className="text-xs text-muted">{t.count} {t.count === 1 ? 'purchase' : 'purchases'}</div>
                  </div>
                  <Money amount={t.amount as Minor} className="text-sm font-semibold text-text" />
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Payments" subtitle="Your share after the platform fee" />
          <div className="flex flex-col gap-1">
            {escrows.slice(0, 10).map((e) => {
              const label = e.subject.kind === 'BOOKING' ? byId(world.bookings, e.subject.id)?.eventName : e.subject.kind === 'ORDER' ? byId(world.orders, e.subject.id)?.lines[0].name : e.subject.kind === 'JOB' ? byId(world.campaigns, byId(world.jobs, e.subject.id)?.campaignId)?.title ?? 'Creator job' : 'Ad campaign';
              return (
                <div key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium text-text">{label}</div>
                    <div className="text-xs text-muted">{partyName(world, e.payer)} · {e.heldAt ? formatDate(e.heldAt) : ''}</div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Money amount={payeeShare(e)} className="text-sm font-semibold text-text" />
                    <StatusPill status={e.state} tones={ESCROW_TONE} label={ESCROW_LABEL[e.state]} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
        <Card>
          <CardHeader title="Payout history" subtitle={artist.payout ? `To ${PAYOUT_METHOD_LABEL[artist.payout.method]} · ${artist.payout.account}` : undefined} />
          {payouts.length === 0 ? <p className="text-sm text-muted">No payouts yet.</p> : (
            <div className="flex flex-col gap-1">
              {payouts.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="flex items-center gap-3"><PayMark method={p.method} /><span className="flex flex-col"><span className="font-medium text-text">To {PAYOUT_METHOD_LABEL[p.method]}</span><span className="text-xs text-muted">{formatDate(p.at)}</span></span></span>
                  <span className="flex items-center gap-2">
                    {p.status !== 'RELEASED' && <StatusPill status={p.status} tones={TRANSACTION_TONE} label={payoutStatusLabel(p.status)} />}
                    <Money amount={p.amount} className="font-semibold text-text" />
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
      {payout && <PayoutModal open onClose={() => setPayout(false)} party={ref} balance={me.wallet.balance} defaultMethod={artist.payout?.method} destination={artist.payout?.account ?? me.phone} />}
    </div>
  );
}
