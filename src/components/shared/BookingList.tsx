'use client';

import Link from 'next/link';
import { Avatar, Money, StatusPill } from '@/components/ui/Display';
import { BOOKING_REQUEST_TONE, BOOKING_TONE } from '@/lib/constants/labels';
import { formatDate } from '@/lib/format';
import { byId, findArtist, partyName } from '@/lib/selectors';
import type { BookingRequest, World } from '@/types';

/** One row per booking request. Shows the booking status once one exists. `side` decides whose name is shown. */
export function BookingList({ world, requests, href, side }: { world: World; requests: BookingRequest[]; href: (r: BookingRequest) => string; side: 'BUYER' | 'ARTIST' }) {
  return (
    <div className="flex flex-col gap-1">
      {requests.map((r) => {
        const artist = findArtist(world, r.artistId);
        const booking = byId(world.bookings, r.bookingId);
        const name = side === 'BUYER' ? artist?.stageName ?? 'Artist' : partyName(world, r.buyer);
        const last = r.counterOffers[r.counterOffers.length - 1];
        return (
          <Link key={r.id} href={href(r)} className="group flex items-center gap-3 py-3 transition">
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium text-text group-hover:text-brand">{r.eventName}</div>
              <div className="truncate text-xs text-muted">
                {name} · {formatDate(r.date, { weekday: 'short', day: 'numeric', month: 'short' })} · {r.location.split(',')[0]}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Money amount={booking?.fee ?? last?.amount ?? r.offer} className="text-sm font-semibold text-text" />
              {booking ? <StatusPill status={booking.status} tones={BOOKING_TONE} /> : <StatusPill status={r.status} tones={BOOKING_REQUEST_TONE} />}
            </div>
          </Link>
        );
      })}
    </div>
  );
}
