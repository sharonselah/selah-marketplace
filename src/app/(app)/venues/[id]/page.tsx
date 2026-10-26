'use client';

import { useParams } from 'next/navigation';
import { BadgeCheck, MapPin } from 'lucide-react';
import { BackLink, EventCard } from '@/components/shared/Cards';
import { ReportButton } from '@/components/shared/ReportModal';
import { Badge, Card, CardHeader, Cover, EmptyState, Money } from '@/components/ui/Display';
import { avatarPhoto } from '@/lib/data/photos';
import { VENUE_TYPE_LABEL } from '@/lib/constants/labels';
import { byId } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { BusinessId } from '@/types';

export default function VenuePage() {
  const { id } = useParams<{ id: BusinessId }>();
  const { world, me } = useViewer();
  const venue = byId(world.businesses, id);
  if (!venue) return <EmptyState title="Venue not found" action={<BackLink href="/discover?tab=venues" />} />;
  const events = world.events.filter((e) => e.venueId === venue.id && (e.status === 'PUBLISHED' || e.status === 'SOLD_OUT'));
  const tables = world.inventory.filter((i) => i.type === 'TABLE' && i.venueId === venue.id);

  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <BackLink href="/discover?tab=venues" label="Venues" />
        {!me.businessIds.includes(venue.id) && <ReportButton target={{ kind: 'BUSINESS', id: venue.id }} />}
      </div>
      <Cover cover={`g${venue.name.length % 8}`} photo={avatarPhoto(venue.name)} className="mt-4 flex min-h-44 flex-col justify-end rounded-card p-6 text-white">
        <div className="flex items-center gap-2 text-display">
          {venue.name} {venue.verified && <BadgeCheck className="size-6" />}
        </div>
        <div className="mt-1 flex items-center gap-1.5 text-sm opacity-90">
          <MapPin className="size-4" /> {venue.address} · {venue.venueType ? VENUE_TYPE_LABEL[venue.venueType] : 'Organiser'}
        </div>
      </Cover>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <section>
          <h2 className="mb-3 text-heading text-text">Upcoming events</h2>
          {events.length ? (
            <div className="grid gap-4 sm:grid-cols-2">
              {events.map((e) => (
                <EventCard key={e.id} event={e} world={world} />
              ))}
            </div>
          ) : (
            <EmptyState title="No upcoming events" body="Check back soon." />
          )}
        </section>
        {tables.length > 0 && (
          <Card className="h-fit">
            <CardHeader title="Tables" subtitle="Reserve from any event page." />
            <div className="flex flex-col gap-3">
              {tables.map(
                (t) =>
                  t.type === 'TABLE' && (
                    <div key={t.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium text-text">{t.name}</div>
                        <div className="text-xs text-muted">Seats {t.capacity}</div>
                      </div>
                      <div className="text-right">
                        <Money amount={t.price} className="font-medium text-text" />
                        {t.available === 0 && <Badge tone="bad">Full</Badge>}
                      </div>
                    </div>
                  ),
              )}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
