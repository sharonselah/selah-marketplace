'use client';

import Link from 'next/link';
import { ArrowLeft, BadgeCheck, MapPin, Star } from 'lucide-react';
import { ARTIST_CATEGORY_LABEL, VENUE_TYPE_LABEL } from '@/lib/constants/labels';
import { formatDate, formatKES, formatPrice } from '@/lib/format';
import { byId, findArtist } from '@/lib/selectors';
import type { SelahEvent, ArtistProfile, BusinessAccount, Minor, World } from '@/types';
import { Avatar, Badge, Cover } from '@/components/ui/Display';
import { avatarPhoto, eventPhoto } from '@/lib/data/photos';
import { ticketsForEvent } from '@/lib/store/actions/orders';

export function BackLink({ href, label = 'Back' }: { href: string; label?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-text">
      <ArrowLeft className="size-4" /> {label}
    </Link>
  );
}

export function EventCard({ event, world }: { event: SelahEvent; world: World }) {
  const venue = byId(world.businesses, event.venueId);
  const tickets = ticketsForEvent(world, event.id);
  const from = tickets.length ? (Math.min(...tickets.map((t) => t.price)) as Minor) : null;
  const d = new Date(event.date);
  return (
    <Link href={`/events/${event.id}`} className="group flex flex-col overflow-hidden rounded-card bg-surface shadow-card transition hover:shadow-raised">
      <Cover cover={event.cover} photo={eventPhoto(event.cover)} className="flex h-36 items-start justify-between p-3">
        <div className="rounded-tile bg-white/90 px-2.5 py-1 text-center text-text">
          <div className="text-[10px] font-semibold uppercase">{d.toLocaleDateString('en-KE', { month: 'short' })}</div>
          <div className="text-lg leading-none font-bold">{d.getDate()}</div>
        </div>
        {event.status === 'SOLD_OUT' && <Badge tone="bad">Sold out</Badge>}
      </Cover>
      <div className="flex flex-1 flex-col gap-1 p-4">
        <div className="font-semibold text-text group-hover:text-brand">{event.title}</div>
        <div className="flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3.5" /> {venue?.name}
        </div>
        <div className="mt-auto flex items-center justify-between pt-2 text-sm">
          <span className="text-muted">{formatDate(event.date, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>
          {from !== null && <span className="font-semibold text-text">from {formatKES(from)}</span>}
        </div>
      </div>
    </Link>
  );
}

export function ArtistCard({ artist, href }: { artist: ArtistProfile; href?: string }) {
  return (
    <Link href={href ?? `/artists/${artist.id}`} className="flex flex-col gap-3 rounded-card bg-surface p-4 shadow-card transition hover:shadow-raised">
      <div className="flex items-center gap-3">
        <Avatar name={artist.stageName} size="lg" verified={artist.verification === 'VERIFIED_ARTIST'} />
        <div className="min-w-0">
          <div className="flex items-center gap-1 truncate font-semibold text-text">{artist.stageName}</div>
          <div className="text-xs text-muted">{ARTIST_CATEGORY_LABEL[artist.category]} · {artist.location.split(',')[0]}</div>
          <div className="mt-0.5 flex items-center gap-1 text-xs text-muted">
            <Star className="size-3.5 fill-accent text-accent" /> {artist.rating.toFixed(1)} · {artist.gigsPlayed} gigs
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-1">
        {artist.genres.slice(0, 3).map((g) => (
          <Badge key={g}>{g}</Badge>
        ))}
      </div>
      <div className="text-sm font-medium text-text">{formatPrice(artist.pricing.booking)}</div>
    </Link>
  );
}

export function VenueCard({ venue, world }: { venue: BusinessAccount; world: World }) {
  const upcoming = world.events.filter((e) => e.venueId === venue.id && e.status === 'PUBLISHED').length;
  return (
    <Link href={`/venues/${venue.id}`} className="flex items-center gap-3 rounded-card bg-surface p-4 shadow-card transition hover:shadow-raised">
      <Cover cover={`g${venue.name.length % 8}`} photo={avatarPhoto(venue.name)} className="flex size-14 shrink-0 items-center justify-center rounded-tile text-lg font-bold text-white">
        {!avatarPhoto(venue.name) && venue.name[0]}
      </Cover>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1 truncate font-semibold text-text">
          {venue.name} {venue.verified && <BadgeCheck className="size-4 text-brand" />}
        </div>
        <div className="text-xs text-muted">
          {venue.venueType ? VENUE_TYPE_LABEL[venue.venueType] : 'Organiser'} · {venue.address.split(',').slice(-2, -1)[0]?.trim() ?? venue.address}
        </div>
        <div className="mt-1 text-xs text-brand">{upcoming} upcoming events</div>
      </div>
    </Link>
  );
}

export function ArtistLine({ world, artistId }: { world: World; artistId: ArtistProfile['id'] }) {
  const a = findArtist(world, artistId);
  if (!a) return null;
  return (
    <Link href={`/artists/${a.id}`} className="flex items-center gap-2 rounded-tile p-1.5 hover:bg-surface-2">
      <Avatar name={a.stageName} size="sm" verified={a.verification === 'VERIFIED_ARTIST'} />
      <span className="text-sm font-medium text-text">{a.stageName}</span>
      <span className="text-xs text-muted">{ARTIST_CATEGORY_LABEL[a.category]}</span>
    </Link>
  );
}
