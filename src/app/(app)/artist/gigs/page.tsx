'use client';

import { useState } from 'react';
import { Inbox } from 'lucide-react';
import { BookingList } from '@/components/shared/BookingList';
import { Card, EmptyState, PageHeader } from '@/components/ui/Display';
import { Tabs } from '@/components/ui/Interactive';
import { byId } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { BookingRequest, World } from '@/types';

type Tab = 'requests' | 'upcoming' | 'past' | 'closed';

function bucket(w: World, r: BookingRequest): Tab {
  if (r.status === 'PENDING' || r.status === 'NEGOTIATING') return 'requests';
  if (r.status !== 'ACCEPTED') return 'closed';
  const b = byId(w.bookings, r.bookingId);
  if (!b) return 'closed';
  if (b.status === 'PAID' || b.status === 'COMPLETED') return 'past';
  if (b.status === 'CANCELLED' || b.status === 'DISPUTED') return 'closed';
  return 'upcoming';
}

export default function GigsPage() {
  const { world, me } = useViewer();
  const [tab, setTab] = useState<Tab>('requests');
  const mine = world.bookingRequests.filter((r) => r.artistId === me.artist!.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const count = (t: Tab) => mine.filter((r) => bucket(world, r) === t).length;
  const list = mine.filter((r) => bucket(world, r) === tab);

  return (
    <div>
      <PageHeader title="Gigs & requests" subtitle="Booking requests from patrons, venues and organisers." />
      <Tabs
        value={tab}
        onChange={setTab}
        className="mb-5 w-fit max-w-full"
        tabs={[
          { value: 'requests', label: 'Requests', count: count('requests') },
          { value: 'upcoming', label: 'Upcoming', count: count('upcoming') },
          { value: 'past', label: 'Completed', count: count('past') },
          { value: 'closed', label: 'Declined & expired', count: count('closed') },
        ]}
      />
      {list.length === 0 ? (
        <EmptyState icon={<Inbox className="size-8" />} title="Nothing here" body={tab === 'requests' ? 'New booking requests will appear here. Tip: pitch a venue from Proposals.' : undefined} />
      ) : (
        <Card padded={false} className="px-5 py-1">
          <BookingList world={world} requests={list} side="ARTIST" href={(r) => `/artist/gigs/${r.id}`} />
        </Card>
      )}
    </div>
  );
}
