'use client';

import { useParams } from 'next/navigation';
import { BackLink } from '@/components/shared/Cards';
import { BookingRequestForm } from '@/components/shared/BookingRequestForm';
import { EmptyState, PageHeader } from '@/components/ui/Display';
import { findArtist } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { ArtistId } from '@/types';

export default function BookArtistPage() {
  const { id } = useParams<{ id: ArtistId }>();
  const { world, me, actingAs, business } = useViewer();
  const artist = findArtist(world, id);
  if (!artist) return <EmptyState title="Artist not found" action={<BackLink href="/discover?tab=artists" />} />;
  if (artist.personId === me.id) return <EmptyState title="You can’t book yourself" action={<BackLink href={`/artists/${artist.id}`} />} />;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader back={<BackLink href={`/artists/${artist.id}`} label={artist.stageName} />} title={`Book ${artist.stageName}`} subtitle={business ? `Booking as ${business.name}` : 'Private party, wedding, corporate event…'} />
      <BookingRequestForm artist={artist} buyer={actingAs} defaultLocation={business?.address ?? me.location} detailHref={(rid) => (business ? `/biz/bookings/${rid}` : `/my-bookings/${rid}`)} />
    </div>
  );
}
