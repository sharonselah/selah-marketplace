'use client';

import { useParams } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { Gavel } from 'lucide-react';
import { PartyLink } from '@/components/admin/AdminUI';
import { BackLink } from '@/components/shared/Cards';
import { EscrowPanel } from '@/components/shared/Escrow';
import { Button } from '@/components/ui/Button';
import { Card, CardHeader, DefinitionList, EmptyState, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Textarea } from '@/components/ui/Field';
import { toast } from '@/components/ui/Toast';
import { BOOKING_TONE, DISPUTE_TONE, ORDER_TONE, humanize } from '@/lib/constants/labels';
import { formatDateTime, formatKES } from '@/lib/format';
import { byId, partyName } from '@/lib/selectors';
import { resolveDispute, startDisputeReview, type DisputeOutcome } from '@/lib/store/actions/admin';
import { useWorld } from '@/lib/store/hooks';
import type { DisputeId } from '@/types';

export default function AdminDisputePage() {
  const { id } = useParams<{ id: DisputeId }>();
  const w = useWorld();
  const [note, setNote] = useState('');
  const d = byId(w.disputes, id);
  const back = <BackLink href="/admin/disputes" label="Disputes" />;
  if (!d) return <EmptyState title="Dispute not found" action={back} />;
  const e = byId(w.escrows, d.escrowId)!;
  const open = d.status === 'OPEN' || d.status === 'UNDER_REVIEW' || d.status === 'ESCALATED';
  const order = e.subject.kind === 'ORDER' ? byId(w.orders, e.subject.id) : undefined;
  const booking = e.subject.kind === 'BOOKING' ? byId(w.bookings, e.subject.id) : undefined;

  const resolve = (outcome: DisputeOutcome) => {
    resolveDispute(d.id, outcome, note.trim());
    toast(outcome === 'BUYER' ? `Refunded ${formatKES(e.amount)} to ${partyName(w, e.payer)}` : outcome === 'SELLER' ? `Released to ${partyName(w, e.payee)}` : 'Escalated to senior review', outcome === 'ESCALATE' ? 'info' : 'good');
  };

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={back} title={d.reason} subtitle={`Opened ${formatDateTime(d.createdAt)} · ${d.id}`} action={<StatusPill status={d.status} tones={DISPUTE_TONE} />} />
      <div className="grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Claim" />
            <DefinitionList
              items={[
                ['Raised by', <PartyLink key="r" world={w} party={d.raisedBy} />],
                ['Payer', <PartyLink key="p" world={w} party={e.payer} />],
                ['Payee', <PartyLink key="e" world={w} party={e.payee} />],
                ['Subject', `${humanize(e.subject.kind)} ${e.subject.id}`],
                ...(order ? ([['Order', <StatusPill key="o" status={order.status} tones={ORDER_TONE} />], ['Items', order.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')]] as [string, ReactNode][]) : []),
                ...(booking ? ([['Booking', <StatusPill key="b" status={booking.status} tones={BOOKING_TONE} />], ['Event', `${booking.eventName}, ${formatDateTime(booking.date)}`]] as [string, ReactNode][]) : []),
              ]}
            />
            <p className="mt-3 border-t border-border pt-3 text-sm text-text">{d.details}</p>
          </Card>
          <EscrowPanel escrow={e} showSplits title="Escrow" />
        </div>

        <Card className="h-fit">
          <CardHeader title={<span className="flex items-center gap-2"><Gavel className="size-4 text-brand" /> Decision</span>} />
          {open ? (
            <div className="flex flex-col gap-3">
              {d.status === 'OPEN' && <Button variant="outline" onClick={() => { startDisputeReview(d.id); toast('Marked under review', 'info'); }}>Start review</Button>}
              <Field label="Note to both parties (optional)">
                <Textarea value={note} onChange={(ev) => setNote(ev.target.value)} placeholder="e.g. Venue confirmed the table was reassigned." />
              </Field>
              <Button onClick={() => resolve('BUYER')}>Resolve for buyer: refund {formatKES(e.amount)}</Button>
              <Button variant="secondary" onClick={() => resolve('SELLER')}>Resolve for seller: release</Button>
              {d.status !== 'ESCALATED' && <Button variant="ghost" onClick={() => resolve('ESCALATE')}>Escalate</Button>}
              <p className="text-xs text-muted">Refunds go to the payer’s Selah wallet. Releases pay the seller their share after the platform fee.</p>
            </div>
          ) : (
            <p className="text-sm text-muted">Closed: {humanize(d.status)}. The escrow is {e.state.toLowerCase().replace('_', ' ')}.</p>
          )}
        </Card>
      </div>
    </div>
  );
}
