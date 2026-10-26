'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Music, Ticket } from 'lucide-react';
import { LinkButton } from '@/components/ui/Button';
import { Cover, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { eventPhoto } from '@/lib/data/photos';
import { Tabs } from '@/components/ui/Interactive';
import { ORDER_TONE } from '@/lib/constants/labels';
import { formatDate } from '@/lib/format';
import { byId, partyName, samePartyRef } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';

type Tab = 'active' | 'past';

export default function OrdersPage() {
  const { world, actingAs } = useViewer();
  const [tab, setTab] = useState<Tab>('active');
  const mine = world.orders.filter((o) => samePartyRef(o.buyer, actingAs));
  const isActive = (s: string) => s === 'PLACED' || s === 'PAID' || s === 'FULFILLED' || s === 'DISPUTED';
  const list = mine.filter((o) => (tab === 'active' ? isActive(o.status) : !isActive(o.status)));

  return (
    <div>
      <PageHeader title="My orders" subtitle="Tickets, tables, bottles and digital purchases." />
      <Tabs value={tab} onChange={setTab} tabs={[{ value: 'active', label: 'Active', count: mine.filter((o) => isActive(o.status)).length }, { value: 'past', label: 'Past' }]} className="mb-5 w-fit" />
      {list.length === 0 ? (
        <EmptyState icon={<Ticket className="size-8" />} title={tab === 'active' ? 'No active orders' : 'No past orders'} body="When you buy tickets, tables or mixes they’ll appear here." action={<LinkButton href="/discover">Find an event</LinkButton>} />
      ) : (
        <div className="flex flex-col gap-3">
          {list.map((o) => {
            const ev = byId(world.events, o.eventId);
            return (
              <Link key={o.id} href={`/orders/${o.id}`} className="flex items-center gap-4 rounded-card bg-surface p-3 shadow-card transition hover:shadow-raised">
                <Cover cover={ev?.cover ?? 'g1'} photo={eventPhoto(ev?.cover ?? 'g1')} className="flex size-16 shrink-0 items-center justify-center rounded-tile text-white">
                  {!ev && <Music className="size-6" />}
                </Cover>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium text-text">{ev?.title ?? o.lines[0].name}</div>
                  <div className="truncate text-xs text-muted">
                    {partyName(world, o.seller)} · {ev ? formatDate(ev.date, { weekday: 'short', day: 'numeric', month: 'short' }) : formatDate(o.createdAt)}
                  </div>
                  <div className="truncate text-xs text-muted">{o.lines.map((l) => `${l.qty}× ${l.name.split(':').pop()?.trim()}`).join(', ')}</div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Money amount={o.total} className="text-sm font-semibold text-text" />
                  <StatusPill status={o.status} tones={ORDER_TONE} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
