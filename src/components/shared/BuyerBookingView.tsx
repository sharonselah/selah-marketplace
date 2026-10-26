'use client';

import Link from 'next/link';
import { useState } from 'react';
import { CalendarCheck, Clock, Flag, Loader2, MapPin, PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Avatar, Card, CardHeader, Money, PageHeader, StatusPill } from '@/components/ui/Display';
import { toast } from '@/components/ui/Toast';
import { BOOKING_REQUEST_TONE, BOOKING_TONE } from '@/lib/constants/labels';
import type { PaymentMethod } from '@/lib/constants/enums';
import { formatDateTime, formatKES } from '@/lib/format';
import { byId, findArtist, partyName, personRef, walletOf } from '@/lib/selectors';
import { acceptRequest, completeBooking, counterOffer, declineRequest, payBooking, signContract } from '@/lib/store/actions/bookings';
import { useViewer } from '@/lib/store/hooks';
import type { BookingRequestId } from '@/types';
import { BackLink } from './Cards';
import { ContractCard } from './Contract';
import { DisputeModal } from './DisputeModal';
import { EscrowPanel } from './Escrow';
import { CounterModal, NegotiationThread } from './NegotiationThread';
import { PaymentMethodPicker, PaymentProcessing, paymentBlocked } from './Payment';

/** Booking request → contract → escrow payment → gig → release, from the buyer's side. */
export function BuyerBookingView({ requestId, backHref }: { requestId: BookingRequestId; backHref: string }) {
  const { world, me, actingAs } = useViewer();
  const [counter, setCounter] = useState(false);
  const [dispute, setDispute] = useState(false);
  const [method, setMethod] = useState<PaymentMethod>('MPESA');
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState<string | null>(null);

  const r = byId(world.bookingRequests, requestId);
  if (!r) return <PageHeader back={<BackLink href={backHref} />} title="Booking not found" />;
  const artist = findArtist(world, r.artistId)!;
  const booking = byId(world.bookings, r.bookingId);
  const contract = booking ? byId(world.contracts, booking.contractId) : undefined;
  const escrow = booking ? byId(world.escrows, booking.escrowId) : undefined;
  const lastCounter = r.counterOffers[r.counterOffers.length - 1];
  const balance = walletOf(world, actingAs);
  const existingDispute = escrow && world.disputes.find((d) => d.escrowId === escrow.id);

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader
        back={<BackLink href={backHref} />}
        title={r.eventName}
        subtitle={
          <span className="flex flex-wrap gap-3">
            <span className="flex items-center gap-1"><Clock className="size-3.5" /> {formatDateTime(r.date)}</span>
            <span className="flex items-center gap-1"><MapPin className="size-3.5" /> {r.location}</span>
          </span>
        }
        action={booking ? <StatusPill status={booking.status} tones={BOOKING_TONE} /> : <StatusPill status={r.status} tones={BOOKING_REQUEST_TONE} />}
      />

      <div className="grid gap-6 md:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          {/* What happens next */}
          {r.status === 'PENDING' && (
            <Card className="flex items-center gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <div>
                <div className="font-semibold text-text">Waiting for {artist.stageName} to respond</div>
                <div className="text-sm text-muted">Artists usually reply within a few minutes. We’ll notify you by SMS.</div>
              </div>
            </Card>
          )}
          {r.status === 'NEGOTIATING' && lastCounter?.by === 'ARTIST' && (
            <Card tone="brand">
              <div className="font-semibold text-text">{artist.stageName} proposed {formatKES(lastCounter.amount)}</div>
              <p className="mt-1 text-sm text-muted">Accept to move to the contract, or send your own counter-offer.</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button onClick={() => { acceptRequest(r.id, 'BUYER'); toast('Counter-offer accepted. Contract ready to sign.'); }}>Accept {formatKES(lastCounter.amount)}</Button>
                <Button variant="outline" onClick={() => setCounter(true)}>Counter</Button>
                <Button variant="ghost" onClick={() => declineRequest(r.id, 'BUYER')}>Cancel request</Button>
              </div>
            </Card>
          )}
          {r.status === 'NEGOTIATING' && lastCounter?.by === 'BUYER' && (
            <Card className="flex items-center gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <div className="text-sm text-text">Counter-offer sent. Waiting for {artist.stageName}…</div>
            </Card>
          )}
          {(r.status === 'DECLINED' || r.status === 'EXPIRED' || r.status === 'CANCELLED') && (
            <Card>
              <div className="font-semibold text-text">{r.status === 'DECLINED' ? `${artist.stageName} can’t make it` : r.status === 'EXPIRED' ? 'This request expired' : 'You cancelled this request'}</div>
              <p className="mt-1 text-sm text-muted">No money was taken. Try another date or browse similar artists.</p>
              <Link href="/discover?tab=artists" className="mt-3 inline-block text-sm font-medium text-brand hover:underline">Browse artists</Link>
            </Card>
          )}

          {booking?.status === 'AWAITING_SIGNATURES' && (
            <Card tone="brand">
              <div className="font-semibold text-text">{artist.stageName} accepted</div>
              <p className="mt-1 text-sm text-muted">Step 1 of 2: review and sign the contract below.</p>
            </Card>
          )}
          {booking?.status === 'CONTRACT_SIGNED' && (
            <Card tone="brand">
              <CardHeader title="Step 2 of 2: pay into escrow" subtitle={`${formatKES(booking.fee)} is held by Selah and released to ${artist.stageName} only after the gig.`} />
              {paying ? (
                <PaymentProcessing method={method} amount={booking.fee} phone={me.phone} onDone={() => { payBooking(booking.id, method); setPaying(false); toast('Booking confirmed!'); }} />
              ) : (
                <>
                  <PaymentMethodPicker value={method} onChange={(m) => { setMethod(m); setPayError(null); }} walletBalance={balance} amount={booking.fee} />
                  {payError && <p className="mt-3 text-sm text-bad">{payError}</p>}
                  <Button className="mt-4" size="lg" block onClick={() => { const b = paymentBlocked(method, booking.fee, balance); if (b) return setPayError(b); setPaying(true); }}>
                    Pay {formatKES(booking.fee)}
                  </Button>
                </>
              )}
            </Card>
          )}
          {booking?.status === 'SCHEDULED' && (
            <Card tone="good">
              <div className="flex items-center gap-2 font-semibold text-good"><CalendarCheck className="size-5" /> You’re booked!</div>
              <p className="mt-1 text-sm text-muted">{artist.stageName} will perform on {formatDateTime(booking.date)}. After the event, confirm it happened and the payment is released.</p>
              <Button className="mt-4" variant="secondary" icon={<PartyPopper className="size-4" />} onClick={() => { completeBooking(booking.id); toast('Marked as completed. Releasing payment.'); }}>
                Simulate: the event happened
              </Button>
            </Card>
          )}
          {booking?.status === 'COMPLETED' && (
            <Card className="flex items-center gap-4">
              <Loader2 className="size-6 animate-spin text-brand" />
              <div className="text-sm text-text">Event completed. Releasing payment to {artist.stageName} after the hold period…</div>
            </Card>
          )}
          {booking?.status === 'PAID' && (
            <Card>
              <div className="font-semibold text-good">All done. {artist.stageName} has been paid.</div>
              <p className="mt-1 text-sm text-muted">Hope it was a great night!</p>
            </Card>
          )}

          {(r.counterOffers.length > 0 || r.message) && <NegotiationThread request={r} viewer="BUYER" artistName={artist.stageName} buyerName={partyName(world, r.buyer)} />}
          {contract && booking && <ContractCard world={world} contract={contract} parties={[booking.buyer, personRef(artist.personId)]} me={actingAs} onSign={() => signContract(contract.id, actingAs)} />}
          {escrow && escrow.state !== 'AWAITING_FUNDS' && <EscrowPanel escrow={escrow} />}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <Link href={`/artists/${artist.id}`} className="flex items-center gap-3">
              <Avatar name={artist.stageName} size="lg" verified={artist.verification === 'VERIFIED_ARTIST'} />
              <div>
                <div className="font-semibold text-text">{artist.stageName}</div>
                <div className="text-xs text-muted">View profile</div>
              </div>
            </Link>
            <div className="mt-4 flex justify-between border-t border-border pt-3 text-sm">
              <span className="text-muted">{booking ? 'Agreed fee' : 'Your offer'}</span>
              <Money amount={booking?.fee ?? lastCounter?.amount ?? r.offer} className="font-semibold text-text" />
            </div>
          </Card>
          {escrow && booking && (booking.status === 'SCHEDULED' || booking.status === 'COMPLETED') && !existingDispute && (
            <Button variant="ghost" icon={<Flag className="size-4" />} onClick={() => setDispute(true)}>Report a problem</Button>
          )}
          {existingDispute && <Link href={`/disputes/${existingDispute.id}`} className="text-sm font-medium text-bad hover:underline">View dispute →</Link>}
        </div>
      </div>
      <CounterModal open={counter} onClose={() => setCounter(false)} suggested={lastCounter?.amount ?? r.offer} onSubmit={(amount, note) => counterOffer(r.id, 'BUYER', amount, note)} />
      {escrow && <DisputeModal open={dispute} onClose={() => setDispute(false)} escrowId={escrow.id} raisedBy={actingAs} />}
    </div>
  );
}
