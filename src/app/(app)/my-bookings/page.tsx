'use client';

import { CalendarPlus } from 'lucide-react';
import { BookingList } from '@/components/shared/BookingList';
import { LinkButton } from '@/components/ui/Button';
import { Card, EmptyState, PageHeader } from '@/components/ui/Display';
import { samePartyRef } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';

export default function MyBookingsPage() {
  const { world, actingAs } = useViewer();
  const requests = world.bookingRequests.filter((r) => samePartyRef(r.buyer, actingAs)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  return (
    <div>
      <PageHeader title="My bookings" subtitle="Artists you’ve booked for your own events." action={<LinkButton href="/discover?tab=artists" icon={<CalendarPlus className="size-4" />}>Book an artist</LinkButton>} />
      {requests.length === 0 ? (
        <EmptyState title="No bookings yet" body="Book a DJ, MC or band for your party. You only pay once they accept, and the money is held safely until after the event." action={<LinkButton href="/discover?tab=artists">Browse artists</LinkButton>} />
      ) : (
        <Card padded={false} className="px-5 py-1">
          <BookingList world={world} requests={requests} side="BUYER" href={(r) => `/my-bookings/${r.id}`} />
        </Card>
      )}
    </div>
  );
}
