'use client';

import { useState } from 'react';
import { Users } from 'lucide-react';
import { ArtistCard } from '@/components/shared/Cards';
import { EmptyState, PageHeader } from '@/components/ui/Display';
import { Input, Select, Toggle } from '@/components/ui/Field';
import { ARTIST_CATEGORY, type ArtistCategory } from '@/lib/constants/enums';
import { ARTIST_CATEGORY_LABEL } from '@/lib/constants/labels';
import { AREAS, GENRES } from '@/lib/data/pools';
import { kes, minPrice } from '@/lib/format';
import { artists, isArtistSeller } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';

const BUDGETS = ['ANY', '15000', '30000', '50000', '100000'] as const;

export default function ArtistDirectory() {
  const { world, me } = useViewer();
  const [q, setQ] = useState('');
  const [category, setCategory] = useState<ArtistCategory | 'ANY'>('ANY');
  const [genre, setGenre] = useState<string>('ANY');
  const [area, setArea] = useState<string>('ANY');
  const [budget, setBudget] = useState<(typeof BUDGETS)[number]>('ANY');
  const [verifiedOnly, setVerifiedOnly] = useState(false);

  const list = artists(world)
    .filter((a) => isArtistSeller(a) && a.personId !== me.id)
    .filter((a) => !q.trim() || `${a.stageName} ${a.bio}`.toLowerCase().includes(q.trim().toLowerCase()))
    .filter((a) => category === 'ANY' || a.category === category)
    .filter((a) => genre === 'ANY' || a.genres.includes(genre))
    .filter((a) => area === 'ANY' || a.location.includes(area))
    .filter((a) => budget === 'ANY' || minPrice(a.pricing.booking) <= kes(Number(budget)))
    .filter((a) => !verifiedOnly || a.verification !== 'PHONE_VERIFIED')
    .sort((a, b) => Number(b.verification === 'VERIFIED_ARTIST') - Number(a.verification === 'VERIFIED_ARTIST') || b.rating - a.rating);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Artist directory" subtitle="Find DJs, MCs, bands and hosts for your nights. Open a profile to send a booking request." />
      <div className="flex flex-col gap-3 rounded-card bg-surface shadow-card p-4">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or style" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Select<ArtistCategory | 'ANY'> value={category} onChange={setCategory} options={[{ value: 'ANY', label: 'All categories' }, ...ARTIST_CATEGORY.map((c) => ({ value: c, label: ARTIST_CATEGORY_LABEL[c] }))]} />
          <Select value={genre} onChange={setGenre} options={[{ value: 'ANY', label: 'All genres' }, ...GENRES.map((g) => ({ value: g, label: g }))]} />
          <Select value={area} onChange={setArea} options={[{ value: 'ANY', label: 'Anywhere' }, ...AREAS.map((a) => ({ value: a, label: a }))]} />
          <Select value={budget} onChange={setBudget} options={BUDGETS.map((b) => ({ value: b, label: b === 'ANY' ? 'Any budget' : `From up to KES ${Number(b).toLocaleString('en-KE')}` }))} />
        </div>
        <Toggle checked={verifiedOnly} onChange={setVerifiedOnly} label="ID-verified artists only" />
      </div>
      {list.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="No artists match" body="Try a wider budget or another area." />
      ) : (
        <>
          <div className="text-sm text-muted">{list.length} artists</div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((a) => (
              <ArtistCard key={a.id} artist={a} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
