'use client';

import { useParams, useRouter } from 'next/navigation';
import { BadgeCheck, CalendarPlus, Globe2, MapPin, Music, ShoppingBag, Star } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { ReportButton } from '@/components/shared/ReportModal';
import { Button, LinkButton } from '@/components/ui/Button';
import { Avatar, Badge, Card, CardHeader, Cover, DefinitionList, EmptyState, Money } from '@/components/ui/Display';
import { ARTIST_CATEGORY_LABEL, CONTENT_TYPE_LABEL, CREATOR_TIER_LABEL, VERIFICATION_LABEL } from '@/lib/constants/labels';
import { formatCount, formatPrice } from '@/lib/format';
import { findArtist, isArtistSeller } from '@/lib/selectors';
import { useViewer } from '@/lib/store/hooks';
import type { ArtistId } from '@/types';

export default function ArtistProfilePage() {
  const { id } = useParams<{ id: ArtistId }>();
  const { world, me } = useViewer();
  const router = useRouter();
  const artist = findArtist(world, id);
  if (!artist) return <EmptyState title="Artist not found" action={<BackLink href="/discover?tab=artists" />} />;
  const own = artist.personId === me.id;
  const content = world.content.filter((c) => c.artistId === artist.id);
  const sells = isArtistSeller(artist);

  return (
    <div>
      <BackLink href="/discover?tab=artists" label="Artists" />
      <Cover cover="g4" className="mt-4 h-36 rounded-card" />
      <div className="-mt-12 flex flex-wrap items-end justify-between gap-4 px-2">
        <div className="flex items-end gap-4">
          <Avatar name={artist.stageName} size="xl" className="rounded-full ring-4 ring-bg" />
          <div className="pb-1">
            <h1 className="flex items-center gap-2 text-title text-text">
              {artist.stageName} {artist.verification === 'VERIFIED_ARTIST' && <BadgeCheck className="size-6 text-brand" />}
            </h1>
            <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
              <span>{ARTIST_CATEGORY_LABEL[artist.category]}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {artist.location}</span>
              <span className="flex items-center gap-1"><Star className="size-3.5 fill-accent text-accent" /> {artist.rating.toFixed(1)} · {artist.gigsPlayed} gigs</span>
            </div>
          </div>
        </div>
        {own ? (
          <LinkButton href="/artist" variant="outline">Open Artist studio</LinkButton>
        ) : (
          <div className="flex items-center gap-2">
            <ReportButton target={{ kind: 'ARTIST', id: artist.id }} />
            {sells && (
              <Button size="lg" icon={<CalendarPlus className="size-4" />} onClick={() => router.push(`/artists/${artist.id}/book`)}>
                Book {artist.stageName.split(' ').pop()}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="About" />
            <p className="text-sm leading-relaxed text-muted">{artist.bio}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {artist.genres.map((g) => (
                <Badge key={g} tone="brand">{g}</Badge>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Media" />
            <div className="grid gap-3 sm:grid-cols-3">
              {artist.media.map((m, i) => (
                <Cover key={m.title} cover={`g${(i + 2) % 8}`} className="flex aspect-video flex-col justify-end rounded-tile p-3 text-white">
                  <span className="text-xs capitalize opacity-80">{m.kind.toLowerCase()}</span>
                  <span className="text-sm font-medium">{m.title}</span>
                </Cover>
              ))}
            </div>
          </Card>
          <Card>
            <CardHeader title="Store" subtitle="Mixes, sets and merch" />
            {content.length === 0 ? (
              <p className="text-sm text-muted">Nothing for sale yet.</p>
            ) : (
              <div className="flex flex-col gap-1">
                {content.map((c) => (
                  <div key={c.id} className="flex items-center gap-3 py-3">
                    <Cover cover={c.cover} className="flex size-14 shrink-0 items-center justify-center rounded-tile text-white">
                      {c.type === 'MERCH' ? <ShoppingBag className="size-5" /> : <Music className="size-5" />}
                    </Cover>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text">{c.title}</div>
                      <div className="text-xs text-muted">{CONTENT_TYPE_LABEL[c.type]} · {c.sales} sold</div>
                      <Money amount={c.price} className="text-sm font-semibold text-text" />
                    </div>
                    {!own && (
                      <div className="flex flex-col items-end gap-1">
                        <Button size="sm" variant="secondary" onClick={() => router.push(`/checkout?items=${c.id}:1`)}>
                          Buy
                        </Button>
                        <ReportButton iconOnly target={{ kind: 'CONTENT', id: c.id }} />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          {sells && (
            <Card>
              <CardHeader title="Rates" />
              <DefinitionList
                items={[
                  ['Booking', formatPrice(artist.pricing.booking)],
                  ['Song request', <Money key="s" amount={artist.pricing.songRequest} />],
                  ['Shout-out', <Money key="o" amount={artist.pricing.shoutOut} />],
                  ['Travels', `Up to ${artist.travelRadiusKm} km`],
                ]}
              />
            </Card>
          )}
          <Card>
            <CardHeader title="Details" />
            <DefinitionList
              items={[
                ['Verification', VERIFICATION_LABEL[artist.verification]],
                ['Languages', <span key="l" className="flex items-center gap-1"><Globe2 className="size-3.5" /> {artist.languages.join(', ')}</span>],
                ['Seller', artist.sellerType === 'BUSINESS' ? artist.sellerBusiness?.name ?? 'Business' : 'Individual'],
              ]}
            />
          </Card>
          {artist.creator && (
            <Card>
              <CardHeader title="Creator" />
              <DefinitionList items={[['Tier', CREATOR_TIER_LABEL[artist.creator.tier]], ['Followers', formatCount(artist.creator.followerCount)], ['Niche', artist.creator.niche.join(', ')]]} />
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
