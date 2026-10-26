'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Search } from 'lucide-react';
import { ArtistCard, EventCard, VenueCard } from '@/components/shared/Cards';
import { EmptyState, PageHeader } from '@/components/ui/Display';
import { Input, Select } from '@/components/ui/Field';
import { Tabs } from '@/components/ui/Interactive';
import { ARTIST_CATEGORY, type ArtistCategory } from '@/lib/constants/enums';
import { ARTIST_CATEGORY_LABEL } from '@/lib/constants/labels';
import { GENRES } from '@/lib/data/pools';
import { minPrice } from '@/lib/format';
import { artists, byId, isArtistSeller } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';

type Tab = 'events' | 'artists' | 'venues';

export default function DiscoverPage() {
  const { world, me } = useViewer();
  const params = useSearchParams();
  const router = useRouter();
  const tab = (params.get('tab') as Tab) ?? 'events';
  const [q, setQ] = useState('');
  const [genre, setGenre] = useState<string>('');
  const [category, setCategory] = useState<ArtistCategory | ''>('');
  const [budget, setBudget] = useState<string>('');
  const needle = q.trim().toLowerCase();

  const events = world.events
    .filter((e) => e.status === 'PUBLISHED' || e.status === 'SOLD_OUT')
    .filter((e) => !needle || e.title.toLowerCase().includes(needle) || byId(world.businesses, e.venueId)?.name.toLowerCase().includes(needle))
    .filter((e) => !genre || e.genres.includes(genre))
    .sort((a, b) => a.date.localeCompare(b.date));

  const artistList = artists(world)
    .filter((a) => isArtistSeller(a) && a.personId !== me.id)
    .filter((a) => !needle || a.stageName.toLowerCase().includes(needle) || a.genres.some((g) => g.toLowerCase().includes(needle)))
    .filter((a) => !genre || a.genres.includes(genre))
    .filter((a) => !category || a.category === category)
    .filter((a) => !budget || minPrice(a.pricing.booking) <= Number(budget) * 100);

  const venues = world.businesses
    .filter((b) => b.capabilities.includes('SELL_VENUE_INVENTORY'))
    .filter((b) => !needle || b.name.toLowerCase().includes(needle) || b.address.toLowerCase().includes(needle));

  return (
    <div>
      <PageHeader title="Discover" subtitle="Events, artists and venues across Kenya." />
      <div className="mb-5 flex flex-col gap-3">
        <Tabs
          value={tab}
          onChange={(t) => router.replace(`/discover?tab=${t}`)}
          tabs={[
            { value: 'events', label: 'Events', count: events.length },
            { value: 'artists', label: 'Artists', count: artistList.length },
            { value: 'venues', label: 'Venues', count: venues.length },
          ]}
          className="self-start"
        />
        <div className="grid gap-2 md:grid-cols-[1fr_auto_auto_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute top-3.5 left-3 size-4 text-muted" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={tab === 'venues' ? 'Search venues or areas' : tab === 'artists' ? 'Search artists or genres' : 'Search events or venues'} className="pl-9" />
          </div>
          {tab !== 'venues' && <Select value={genre} onChange={setGenre} options={[{ value: '', label: 'All genres' }, ...GENRES.map((g) => ({ value: g, label: g }))]} />}
          {tab === 'artists' && (
            <>
              <Select value={category} onChange={setCategory} options={[{ value: '' as ArtistCategory, label: 'All categories' }, ...ARTIST_CATEGORY.map((c) => ({ value: c, label: ARTIST_CATEGORY_LABEL[c] }))]} />
              <Select value={budget} onChange={setBudget} options={[{ value: '', label: 'Any budget' }, { value: '15000', label: 'Up to KES 15K' }, { value: '30000', label: 'Up to KES 30K' }, { value: '60000', label: 'Up to KES 60K' }]} />
            </>
          )}
        </div>
      </div>

      {tab === 'events' &&
        (events.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((e) => (
              <EventCard key={e.id} event={e} world={world} />
            ))}
          </div>
        ) : (
          <EmptyState title="No events match" body="Try a different search or genre." />
        ))}
      {tab === 'artists' &&
        (artistList.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {artistList.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        ) : (
          <EmptyState title="No artists match" body="Loosen your filters to see more artists." />
        ))}
      {tab === 'venues' &&
        (venues.length ? (
          <div className="grid gap-3 md:grid-cols-2">
            {venues.map((v) => (
              <VenueCard key={v.id} venue={v} world={world} />
            ))}
          </div>
        ) : (
          <EmptyState title="No venues match" />
        ))}
    </div>
  );
}
