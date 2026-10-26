'use client';

import { useState } from 'react';
import { CheckCircle2, Armchair, QrCode, ScanLine, Ticket } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar, Badge, Card, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { Field, Input, Select } from '@/components/ui/Field';
import { Modal, ProcessingSteps, Tabs } from '@/components/ui/Interactive';
import { toast } from '@/components/ui/Toast';
import { ORDER_TONE } from '@/lib/constants/labels';
import { timeAgo } from '@/lib/format';
import { byId, partyName, samePartyRef } from '@/lib/selectors';
import { checkInOrder } from '@/lib/store/actions/orders';
import { assignTable, findOrderByCode } from '@/lib/store/actions/venue';
import { useViewer } from '@/lib/store/hooks';
import type { BusinessId, EventId, Order, World } from '@/types';

type Filter = 'waiting' | 'in' | 'issues';
const FILTER: Record<Filter, Order['status'][]> = { waiting: ['PAID', 'PLACED'], in: ['FULFILLED', 'COMPLETED'], issues: ['DISPUTED', 'REFUNDED'] };

const hasTable = (w: World, o: Order) => o.lines.some((l) => w.inventory.find((i) => i.id === l.itemId)?.type === 'TABLE');

export default function CheckInPage() {
  const { world, actingAs, business } = useViewer();
  const b = business!;
  const [filter, setFilter] = useState<Filter>('waiting');
  const [event, setEvent] = useState<EventId | 'ALL'>('ALL');
  const [scanning, setScanning] = useState(false);
  const [tableFor, setTableFor] = useState<Order | null>(null);
  const all = world.orders.filter((o) => samePartyRef(o.seller, actingAs));
  const scoped = all.filter((o) => event === 'ALL' || o.eventId === event);
  const list = scoped.filter((o) => FILTER[filter].includes(o.status)).sort((a, c) => c.createdAt.localeCompare(a.createdAt));
  const eventIds = [...new Set(all.flatMap((o) => (o.eventId ? [o.eventId] : [])))];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Orders & check-in" subtitle="Scan guests in at the door. Each scan releases that order’s money after the hold." action={<Button icon={<ScanLine className="size-4" />} onClick={() => setScanning(true)}>Scan QR</Button>} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={filter} onChange={setFilter} tabs={(['waiting', 'in', 'issues'] as const).map((f) => ({ value: f, label: { waiting: 'To check in', in: 'Checked in', issues: 'Refunds & disputes' }[f], count: scoped.filter((o) => FILTER[f].includes(o.status)).length }))} />
        <Select<EventId | 'ALL'> className="sm:w-64" value={event} onChange={setEvent} options={[{ value: 'ALL', label: 'All events & walk-ins' }, ...eventIds.map((id) => ({ value: id, label: byId(world.events, id)?.title ?? id }))]} />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Ticket className="size-8" />} title="No orders here" body={filter === 'waiting' ? 'New ticket, table and bottle orders show up here as guests buy.' : 'Nothing to show for this filter.'} />
      ) : (
        <Card padded={false}>
          <div className="flex flex-col gap-1">
            {list.map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-3 p-4">
                <Avatar name={partyName(world, o.buyer)} size="sm" />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium text-text">{partyName(world, o.buyer)}</div>
                  <div className="truncate text-xs text-muted">{o.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')} · {timeAgo(o.createdAt)}</div>
                  {o.tableLabel && <Badge tone="info" className="mt-1"><Armchair className="size-3" /> {o.tableLabel}</Badge>}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Money amount={o.total} className="text-sm font-semibold text-text" />
                  <StatusPill status={o.status} tones={ORDER_TONE} />
                </div>
                {o.status === 'PAID' && (
                  <div className="flex w-full gap-2 sm:w-auto">
                    {hasTable(world, o) && <Button size="sm" variant="outline" icon={<Armchair className="size-4" />} onClick={() => setTableFor(o)}>{o.tableLabel ? 'Change table' : 'Assign table'}</Button>}
                    <Button size="sm" variant="secondary" onClick={() => { checkInOrder(o.id); toast(`${partyName(world, o.buyer)} checked in`); }}>Check in</Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}
      {scanning && <ScanModal onClose={() => setScanning(false)} venueId={b.id} orders={all} world={world} />}
      {tableFor && <TableModal order={tableFor} onClose={() => setTableFor(null)} />}
    </div>
  );
}

function TableModal({ order, onClose }: { order: Order; onClose: () => void }) {
  const [label, setLabel] = useState(order.tableLabel ?? '');
  return (
    <Modal open onClose={onClose} title="Assign a table" footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button disabled={!label.trim()} onClick={() => { assignTable(order.id, label); toast('Table assigned. The guest was notified.'); onClose(); }}>Assign</Button></>}>
      <Field label="Table or area" hint="The guest gets an SMS with this.">
        <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Booth 4, Rooftop C2" autoFocus />
      </Field>
    </Modal>
  );
}

/** Simulated door scanner: pretend camera, or type the code under the QR. */
function ScanModal({ onClose, venueId, orders, world }: { onClose: () => void; venueId: BusinessId; orders: Order[]; world: World }) {
  const [code, setCode] = useState('');
  const [found, setFound] = useState<Order | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [admitted, setAdmitted] = useState(false);
  const next = orders.find((o) => o.status === 'PAID');

  const resolve = (value: string) => {
    const o = findOrderByCode(venueId, value, orders);
    if (!o) return setError('No order with that code at this venue.');
    if (o.status !== 'PAID') return setError(o.status === 'REFUNDED' ? 'This order was refunded. Do not admit.' : 'Already checked in.');
    setError(null);
    setFound(o);
  };

  return (
    <Modal open onClose={onClose} title="Scan guest QR">
      {admitted && found ? (
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <CheckCircle2 className="size-14 text-good" />
          <div className="text-heading text-text">Admit {partyName(world, found.buyer)}</div>
          <div className="text-sm text-muted">{found.lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}</div>
          {found.tableLabel && <Badge tone="info">{found.tableLabel}</Badge>}
          <div className="mt-2 flex gap-2">
            <Button variant="outline" onClick={() => { setFound(null); setAdmitted(false); setCode(''); }}>Scan next</Button>
            <Button onClick={onClose}>Done</Button>
          </div>
        </div>
      ) : found ? (
        <ProcessingSteps title="Checking ticket" done="Valid ticket" steps={['Reading QR code', 'Verifying order and payment', 'Marking as redeemed']} stepMs={700} onDone={() => { checkInOrder(found.id); setAdmitted(true); }} />
      ) : (
        <div className="flex flex-col gap-4">
          <div className="relative mx-auto flex size-56 items-center justify-center overflow-hidden rounded-card bg-black/90">
            <QrCode className="size-24 text-white/20" />
            <div className="animate-progress absolute inset-x-6 h-0.5 bg-good shadow-[0_0_12px_var(--good)]" />
            <div className="absolute inset-6 rounded-card border-2 border-white/40" />
          </div>
          <Button block disabled={!next} onClick={() => next && resolve(next.qrCode ?? next.id)}>
            {next ? `Simulate scan: ${partyName(world, next.buyer)}` : 'No guests waiting'}
          </Button>
          <div className="flex items-end gap-2">
            <Field label="Or enter the code under the QR" className="flex-1">
              <Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="SELAH-…" />
            </Field>
            <Button variant="secondary" disabled={!code.trim()} onClick={() => resolve(code)}>Check</Button>
          </div>
          {error && <div className="rounded-tile bg-bad-soft px-3 py-2 text-sm text-bad">{error}</div>}
        </div>
      )}
    </Modal>
  );
}
