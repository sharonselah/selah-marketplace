'use client';

import { useState } from 'react';
import { CalendarCheck, MonitorPlay, Send, ShieldCheck, ShoppingBag } from 'lucide-react';
import { SplitBreakdown } from '@/components/shared/Escrow';
import { ExportButton } from '@/components/shared/ExportButton';
import { PayoutModal } from '@/components/shared/WalletModals';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, Cover, Money, PageHeader, Stat, StatusPill } from '@/components/ui/Display';
import { PAYOUT_METHOD_LABEL, TRANSACTION_TONE, payoutStatusLabel } from '@/lib/constants/labels';
import { csvDate, csvMoney, fileSlug, statementRows, today } from '@/lib/csv';
import { formatBps, formatDateTime, formatKES, kes } from '@/lib/format';
import { currentPolicy, heldFor, payeeShare, quoteSplits, samePartyRef, walletOf } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { Minor } from '@/types';
import { PayMark } from '@/components/ui/Visuals';
import { eventPhoto } from '@/lib/data/photos';

const sum = (xs: number[]) => xs.reduce((a, x) => a + x, 0) as Minor;

export default function PayoutsPage() {
  const { world, me, actingAs, business } = useViewer();
  const b = business!;
  const [payout, setPayout] = useState(false);
  const policy = currentPolicy(world);
  const mine = world.escrows.filter((e) => samePartyRef(e.payee, actingAs));
  const released = (kind: 'ORDER' | 'AD_CAMPAIGN') => sum(mine.filter((e) => e.subject.kind === kind && e.state === 'RELEASED').map(payeeShare));
  const bookingCosts = sum(world.bookings.filter((x) => samePartyRef(x.buyer, actingAs) && x.status !== 'CANCELLED' && x.status !== 'AWAITING_SIGNATURES' && x.status !== 'CONTRACT_SIGNED').map((x) => x.fee));
  const payouts = world.payouts.filter((p) => samePartyRef(p.party, actingAs)).sort((a, c) => c.at.localeCompare(a.at));
  const balance = walletOf(world, actingAs);
  const byEvent = world.events
    .filter((e) => e.venueId === b.id)
    .map((e) => ({ e, orders: world.orders.filter((o) => o.eventId === e.id && o.status !== 'REFUNDED') }))
    .filter((x) => x.orders.length)
    .sort((a, c) => c.e.date.localeCompare(a.e.date));
  // Worked example of the split engine at today's policy rates.
  const example = kes(10000);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Payouts & reports" subtitle={`Money in and out for ${b.name}.`} action={
          <div className="flex flex-wrap gap-2">
            <ExportButton filename={`${fileSlug(world, actingAs)}-statement-${today()}`} build={() => statementRows(world, actingAs)} label="Statement" />
            <Button icon={<Send className="size-4" />} disabled={balance <= 0} onClick={() => setPayout(true)}>Request payout</Button>
          </div>
        } />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Sales released" value={<Money amount={released('ORDER')} />} icon={<ShoppingBag className="size-4" />} hint="After check-in and the hold" />
        <Stat label="Held in escrow" value={<Money amount={heldFor(world, actingAs)} />} icon={<ShieldCheck className="size-4" />} hint="Paid out after fulfilment" />
        <Stat label="Ad revenue share" value={<Money amount={released('AD_CAMPAIGN')} />} icon={<MonitorPlay className="size-4" />} hint="From brands on your screens" />
        <Stat label="Artist booking costs" value={<Money amount={bookingCosts} />} icon={<CalendarCheck className="size-4" />} hint="Paid into escrow" />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader
              title="Sales by event"
              action={
                <ExportButton
                  size="sm"
                  filename={`${fileSlug(world, actingAs)}-sales-by-event-${today()}`}
                  build={() => ({
                    head: ['Event date', 'Event', 'Orders', 'Gross sales (KES)'],
                    rows: byEvent.map(({ e, orders }) => [csvDate(e.date), e.title, orders.length, csvMoney(sum(orders.map((o) => o.total)))]),
                  })}
                />
              }
            />
            {byEvent.length === 0 ? (
              <p className="text-sm text-muted">No event sales yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {byEvent.map(({ e, orders }) => (
                  <div key={e.id} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <Cover cover={e.cover} photo={eventPhoto(e.cover)} className="size-11 shrink-0 rounded-tile" />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-text">{e.title}</div>
                      <div className="text-xs text-muted">{formatDateTime(e.date)} · {orders.length} orders</div>
                    </div>
                    <Money amount={sum(orders.map((o) => o.total))} className="font-semibold text-text" />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card>
            <CardHeader title="Payout history" subtitle={b.payout ? `${PAYOUT_METHOD_LABEL[b.payout.method]} · ${b.payout.bankName ?? ''} ${b.payout.account}` : 'No payout account yet'} />
            {payouts.length === 0 ? (
              <p className="text-sm text-muted">No payouts yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {payouts.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 py-3">
                    <PayMark method={p.method} />
                    <div className="flex-1 text-sm">
                      <div className="font-medium text-text">To {PAYOUT_METHOD_LABEL[p.method]}</div>
                      <div className="text-xs text-muted">{formatDateTime(p.at)}</div>
                    </div>
                    <Money amount={p.amount} className="text-sm font-semibold text-text" />
                    <StatusPill status={p.status} tones={TRANSACTION_TONE} label={payoutStatusLabel(p.status)} />
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader title="How you’re paid" subtitle={`Example: a ${formatKES(example)} sale today`} />
          <SplitBreakdown total={example} splits={quoteSplits(world, example, actingAs)} me={actingAs} />
          <ul className="mt-3 flex flex-col gap-1.5 text-xs text-muted">
            <li>• Screen ads: Selah keeps a {formatBps(policy.commissionBps.AD_BROKER_SHARE)} broker share.</li>
            <li>• Funds release {policy.escrowHoldHours}h after check-in unless a guest disputes.</li>
            <li>• Minimum payout {formatKES(policy.minPayoutThreshold)}.</li>
          </ul>
        </Card>
      </div>
      {payout && <PayoutModal open onClose={() => setPayout(false)} party={actingAs} balance={balance} destination={b.payout?.account ?? me.phone} />}
    </div>
  );
}
