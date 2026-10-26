'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarPlus, Sparkles } from 'lucide-react';
import { ReadinessBanner } from '@/components/shared/Business';
import { LinkButton } from '@/components/ui/Button';
import { Cover, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { eventPhoto } from '@/lib/data/photos';
import { Tabs } from '@/components/ui/Interactive';
import { ProgressBar } from '@/components/ui/Visuals';
import type { EventStatus } from '@/lib/constants/enums';
import { EVENT_TONE } from '@/lib/constants/labels';
import { formatDateTime } from '@/lib/format';
import { ticketsForEvent } from '@/lib/store/actions/orders';
import { useViewer } from '@/lib/store/hooks';
import type { Minor } from '@/types';

type Filter = 'upcoming' | 'DRAFT' | 'past';
const UPCOMING: EventStatus[] = ['PUBLISHED', 'SOLD_OUT'];

export default function EventsPage() {
  const { world, business } = useViewer();
  const b = business!;
  const [filter, setFilter] = useState<Filter>('upcoming');
  const mine = world.events.filter((e) => e.venueId === b.id);
  const match = (s: EventStatus) => (filter === 'upcoming' ? UPCOMING.includes(s) : filter === 'DRAFT' ? s === 'DRAFT' : s === 'COMPLETED' || s === 'CANCELLED');
  const list = mine.filter((e) => match(e.status)).sort((a, c) => (filter === 'past' ? c.date.localeCompare(a.date) : a.date.localeCompare(c.date)));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Events" subtitle="Create a draft, attach tickets, then publish it to Discover." action={<LinkButton href="/biz/events/new" icon={<CalendarPlus className="size-4" />}>New event</LinkButton>} />
      <ReadinessBanner business={b} />
      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'upcoming', label: 'Live', count: mine.filter((e) => UPCOMING.includes(e.status)).length },
          { value: 'DRAFT', label: 'Drafts', count: mine.filter((e) => e.status === 'DRAFT').length },
          { value: 'past', label: 'Past & cancelled', count: mine.filter((e) => e.status === 'COMPLETED' || e.status === 'CANCELLED').length },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState icon={<Sparkles className="size-8" />} title="Nothing here" body={filter === 'DRAFT' ? 'Drafts you start show here until you publish them.' : 'Create an event and publish it to start selling tickets.'} action={<LinkButton href="/biz/events/new">New event</LinkButton>} />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {list.map((e) => {
            const tickets = ticketsForEvent(world, e.id);
            const sold = tickets.reduce((a, t) => a + (t.type === 'TICKET' ? t.sold : 0), 0);
            const cap = tickets.reduce((a, t) => a + (t.type === 'TICKET' ? t.capacity : 0), 0);
            const revenue = world.orders.filter((o) => o.eventId === e.id && o.status !== 'REFUNDED').reduce((a, o) => a + o.total, 0) as Minor;
            return (
              <Link key={e.id} href={`/biz/events/${e.id}`} className="flex gap-4 rounded-card bg-surface p-4 shadow-card transition hover:shadow-raised">
                <Cover cover={e.cover} photo={eventPhoto(e.cover)} className="size-20 shrink-0 rounded-tile" />
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-start justify-between gap-2">
                    <div className="truncate font-semibold text-text">{e.title}</div>
                    <StatusPill status={e.status} tones={EVENT_TONE} />
                  </div>
                  <div className="text-xs text-muted">{formatDateTime(e.date)}</div>
                  {cap > 0 ? (
                    <>
                      <ProgressBar value={sold} max={cap} className="mt-1" />
                      <div className="flex justify-between text-xs text-muted">
                        <span>{sold}/{cap} tickets</span>
                        <Money amount={revenue} />
                      </div>
                    </>
                  ) : (
                    <div className="text-xs text-warn">No tickets yet</div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
