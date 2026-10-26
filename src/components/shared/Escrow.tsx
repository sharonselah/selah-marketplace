'use client';

import { Lock } from 'lucide-react';
import { COMMISSION_TYPE_LABEL, ESCROW_LABEL, ESCROW_TONE } from '@/lib/constants/labels';
import { cn } from '@/lib/cn';
import { formatBps, formatDate, formatDateTime, formatKES } from '@/lib/format';
import { partyName, quoteSplits, samePartyRef, type FeeType } from '@/lib/selectors';
import { useWorld } from '@/lib/store/hooks';
import type { Escrow, Minor, PartyRef, Split } from '@/types';
import { Card, CardHeader, StatusPill } from '@/components/ui/Display';
import { Timeline } from '@/components/ui/Visuals';

const HAPPY_PATH = ['AWAITING_FUNDS', 'FUNDS_HELD', 'FULFILLED', 'RELEASED'] as const;

/** Escrow state + split breakdown. Shared by orders, bookings, jobs and ad campaigns. */
export function EscrowPanel({ escrow, showSplits = false, me, title = 'Payment protection' }: { escrow: Escrow; showSplits?: boolean; me?: PartyRef; title?: string }) {
  const offPath = escrow.state === 'REFUNDED' || escrow.state === 'DISPUTED';
  const timelineState = offPath ? (escrow.heldAt ? 'FUNDS_HELD' : 'AWAITING_FUNDS') : escrow.state;
  const explainer: Record<Escrow['state'], string> = {
    AWAITING_FUNDS: 'Waiting for payment. Nothing has been charged yet.',
    FUNDS_HELD: 'Money is held safely by Selah. The seller is paid only after fulfilment.',
    FULFILLED: `Fulfilled. Funds release automatically${escrow.releaseAt ? ` around ${formatDateTime(escrow.releaseAt)}` : ''} unless a dispute is raised.`,
    RELEASED: 'Funds have been released to the seller.',
    REFUNDED: 'Funds were returned to the payer.',
    DISPUTED: 'Funds are frozen while a dispute is reviewed.',
  };
  return (
    <Card>
      <CardHeader title={<span className="flex items-center gap-2"><Lock className="size-4 text-brand" /> {title}</span>} action={<StatusPill status={escrow.state} tones={ESCROW_TONE} label={ESCROW_LABEL[escrow.state]} />} />
      <Timeline steps={HAPPY_PATH} current={timelineState as (typeof HAPPY_PATH)[number]} failed={offPath ? escrow.state : undefined} labels={{ AWAITING_FUNDS: 'Awaiting', FUNDS_HELD: 'Held', FULFILLED: 'Fulfilled', RELEASED: 'Released' }} />
      <p className="mt-4 text-sm text-muted">{explainer[escrow.state]}</p>
      {showSplits && <SplitBreakdown className="mt-4" total={escrow.amount} splits={escrow.splits} me={me ?? escrow.payee} />}
    </Card>
  );
}

/**
 * Split engine output (6.4): who gets what, at which rate, under which policy version.
 * Escrows keep the version they were opened under, so old payments stay auditable after a rate change.
 */
export function SplitBreakdown({ total, splits, me, className }: { total: Minor; splits: Split[]; me?: PartyRef; className?: string }) {
  const world = useWorld();
  const version = splits[0]?.policyVersion;
  const policy = world.policy.find((p) => p.version === version);
  return (
    <div className={cn('text-sm', className)}>
      <div className="flex justify-between font-medium text-text">
        <span>Total paid</span>
        <span>{formatKES(total)}</span>
      </div>
      {splits.map((s) => {
        const mine = !!me && s.to !== 'PLATFORM' && samePartyRef(s.to, me);
        return (
          <div key={s.type} className={cn('mt-1.5 flex items-baseline justify-between gap-3', mine ? 'font-medium text-text' : 'text-muted')}>
            <span className="min-w-0">
              {mine ? 'You receive' : COMMISSION_TYPE_LABEL[s.type]}
              <span className="ml-1.5 text-xs text-muted">
                {formatBps(total ? Math.round((s.amount / total) * 10000) : 0)} · {s.to === 'PLATFORM' ? 'Selah' : partyName(world, s.to)}
              </span>
            </span>
            <span className="shrink-0">{s.to === 'PLATFORM' ? `− ${formatKES(s.amount)}` : formatKES(s.amount)}</span>
          </div>
        );
      })}
      {version && (
        <div className="mt-2 border-t border-border pt-2 text-[11px] text-muted">
          Rates from policy {version}{policy ? `, effective ${formatDate(policy.effectiveFrom)}` : ''}
        </div>
      )}
    </div>
  );
}

/** Pre-transaction quote for sellers: what they'd take home at `amount` under the current policy. */
export function PayoutPreview({ amount, payee, feeBps, feeType, className }: { amount: Minor; payee: PartyRef; feeBps?: number; feeType?: FeeType; className?: string }) {
  const world = useWorld();
  if (!amount) return null;
  const splits = quoteSplits(world, amount, payee, { feeBps, feeType });
  const fee = splits.find((s) => s.to === 'PLATFORM');
  const take = splits.find((s) => s.to !== 'PLATFORM');
  return (
    <p className={cn('text-xs text-muted', className)}>
      You receive <span className="font-semibold text-text">{formatKES(take?.amount ?? amount)}</span>
      {fee && ` after the ${formatBps(Math.round((fee.amount / amount) * 10000))} ${COMMISSION_TYPE_LABEL[fee.type].toLowerCase()}`} (policy {splits[0]?.policyVersion}).
    </p>
  );
}
