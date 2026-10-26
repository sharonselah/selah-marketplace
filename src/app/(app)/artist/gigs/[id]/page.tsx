'use client';

import { useParams } from 'next/navigation';
import { useState } from 'react';
import { CalendarCheck, Clock, Loader2, MapPin, Mic2 } from 'lucide-react';
import { BackLink } from '@/components/shared/Cards';
import { ContractCard } from '@/components/shared/Contract';
import { EscrowPanel, PayoutPreview } from '@/components/shared/Escrow';
import { CounterModal, NegotiationThread } from '@/components/shared/NegotiationThread';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, CardHeader, DefinitionList, EmptyState, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { toast } from '@/components/ui/Toast';
import { BOOKING_REQUEST_TONE, BOOKING_TONE } from '@/lib/constants/labels';
import { formatDateTime, formatKES, minPrice, timeAgo } from '@/lib/format';
import { byId, partyName, personRef } from '@/lib/selectors';
import { acceptRequest, completeBooking, counterOffer, declineRequest, signContract } from '@/lib/store/actions/bookings';
import { useViewer } from '@/lib/store/hooks';
import type { BookingRequestId } from '@/types';

export default function ArtistGigPage() {
  const { id } = useParams<{ id: BookingRequestId }>();
  const { world, me } = useViewer();
  const [counter, setCounter] = useState(false);
  const artist = me.artist!;
  const r = byId(world.bookingRequests, id);
  if (!r || r.artistId !== artist.id) return <EmptyState title="Request not found" action={<BackLink href="/artist/gigs" />} />;

  const booking = byId(world.bookings, r.bookingId);
  const contract = booking ? byId(world.contracts, booking.contractId) : undefined;
  const escrow = booking ? byId(world.escrows, booking.escrowId) : undefined;
  const last = r.counterOffers.at(-1);
  const currentAmount = last?.amount ?? r.offer;
  const buyerName = partyName(world, r.buyer);
  const myRef = personRef(me.id);
  const needsResponse = r.status === 'PENDING' || (r.status === 'NEGOTIATING' && last?.by === 'BUYER');
  const belowFloor = currentAmount < minPrice(artist.pricing.booking);
  const clash = world.availability.find((a) => a.artistId === artist.id && a.date.slice(0, 10) === r.date.slice(0, 10) && a.bookingId !== booking?.id && a.status !== 'AVAILABLE');

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={<BackLink href="/artist/gigs" label="Gigs & requests" />}
        title={r.eventName}
        subtitle={
          <span className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {formatDateTime(r.date)} · {r.durationHours}h</span>
            <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {r.location}</span>
          </span>
        }
        action={booking ? <StatusPill status={booking.status} tones={BOOKING_TONE} /> : <StatusPill status={r.status} tones={BOOKING_REQUEST_TONE} />}
      />

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          {needsResponse && (
            <Card tone="brand">
              <div className="font-semibold text-text">{buyerName} {last ? `countered with ${formatKES(currentAmount)}` : `offers ${formatKES(currentAmount)}`}</div>
              <PayoutPreview className="mt-1" amount={currentAmount} payee={myRef} />
              {belowFloor && <p className="mt-1 text-sm text-warn">This is below your minimum of {formatKES(minPrice(artist.pricing.booking))}.</p>}
              {clash && <p className="mt-1 text-sm text-warn">Heads up: you have something {clash.status.toLowerCase()} that day{clash.note ? ` (${clash.note})` : ''}.</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => { acceptRequest(r.id, 'ARTIST'); toast('Accepted. Contract sent to the buyer.'); }}>Accept {formatKES(currentAmount)}</Button>
                <Button variant="outline" onClick={() => setCounter(true)}>Counter-offer</Button>
                <Button variant="ghost" onClick={() => { declineRequest(r.id, 'ARTIST'); toast('Request declined', 'info'); }}>Decline</Button>
              </div>
            </Card>
          )}
          {r.status === 'NEGOTIATING' && last?.by === 'ARTIST' && (
            <Card className="flex items-center gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <div className="text-sm text-text">Counter-offer sent. Waiting for {buyerName}…</div>
            </Card>
          )}
          {booking?.status === 'AWAITING_SIGNATURES' && (
            <Card className="flex items-center gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <div className="text-sm text-text">{contract?.signedBy.some((p) => p.kind === 'PERSON' && p.id === me.id) ? `Waiting for ${buyerName} to sign and pay into escrow…` : 'Sign the contract below to confirm.'}</div>
            </Card>
          )}
          {booking?.status === 'CONTRACT_SIGNED' && (
            <Card className="flex items-center gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <div className="text-sm text-text">Contract signed. Waiting for {buyerName} to pay into escrow…</div>
            </Card>
          )}
          {booking?.status === 'SCHEDULED' && (
            <Card tone="good">
              <div className="flex items-center gap-2 font-semibold text-good"><CalendarCheck className="size-5" /> Confirmed and paid</div>
              <p className="mt-1 text-sm text-muted">{formatKES(booking.fee)} is held in escrow. After your set, mark the gig as performed and the money is released to your wallet.</p>
              <Button className="mt-4" variant="secondary" icon={<Mic2 className="size-4" />} onClick={() => { completeBooking(booking.id); toast('Gig marked as performed. Payment releasing.'); }}>
                Mark as performed
              </Button>
            </Card>
          )}
          {booking?.status === 'COMPLETED' && (
            <Card className="flex items-center gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <div className="text-sm text-text">Gig completed. Releasing payment after the hold period…</div>
            </Card>
          )}
          {booking?.status === 'PAID' && (
            <Card>
              <div className="font-semibold text-good">Paid. Your share is in your wallet.</div>
            </Card>
          )}
          {(r.status === 'DECLINED' || r.status === 'EXPIRED' || r.status === 'CANCELLED') && (
            <Card><div className="text-sm text-muted">This request is closed ({r.status.toLowerCase()}).</div></Card>
          )}

          <NegotiationThread request={r} viewer="ARTIST" artistName={artist.stageName} buyerName={buyerName} />
          {contract && booking && <ContractCard world={world} contract={contract} parties={[booking.buyer, myRef]} me={myRef} onSign={() => signContract(contract.id, myRef)} />}
          {escrow && escrow.state !== 'AWAITING_FUNDS' && <EscrowPanel escrow={escrow} showSplits me={myRef} title="Your payment" />}
        </div>

        <Card className="h-fit">
          <CardHeader title="Booked by" />
          <div className="flex items-center gap-3">
            <Avatar name={buyerName} />
            <div>
              <div className="font-medium text-text">{buyerName}</div>
              <div className="text-xs text-muted">{r.buyer.kind === 'BUSINESS' ? 'Business account' : 'Patron'} · requested {timeAgo(r.createdAt)}</div>
            </div>
          </div>
          <div className="mt-5 border-t border-border pt-5">
            <DefinitionList items={[['Fee', <Money key="f" amount={booking?.fee ?? currentAmount} />], ['Duration', `${r.durationHours} hours`], ['Your minimum', formatKES(minPrice(artist.pricing.booking))]]} />
          </div>
        </Card>
      </div>
      <CounterModal open={counter} onClose={() => setCounter(false)} suggested={minPrice(artist.pricing.booking) > currentAmount ? minPrice(artist.pricing.booking) : currentAmount} onSubmit={(amount, note) => counterOffer(r.id, 'ARTIST', amount, note)} />
    </div>
  );
}
