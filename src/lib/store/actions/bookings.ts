'use client';

import type { PaymentMethod } from '@/lib/constants/enums';
import { formatKES, minPrice, newId, nowISO } from '@/lib/format';
import { byId, findArtist, partyName, personRef, samePartyRef } from '@/lib/selectors';
import type { ArtistId, BookingId, BookingRequest, BookingRequestId, ContractId, ISODate, Minor, PartyRef, World } from '@/types';
import { commit, later } from '../store';
import { fundEscrow, markFulfilled, openEscrow, releaseEscrow } from './money';
import { DELAY, notify } from './util';

// Booking flow (7.1): REQUESTED → ACCEPTED/NEGOTIATING/DECLINED → contract signed → paid (SCHEDULED) → COMPLETED → PAID.

const artistRef = (w: World, artistId: ArtistId): PartyRef => personRef(findArtist(w, artistId)!.personId);
const buyerHref = (r: BookingRequest) => (r.buyer.kind === 'BUSINESS' ? `/biz/bookings/${r.id}` : `/my-bookings/${r.id}`);

/** On acceptance a booking + contract + unfunded escrow are created. */
function accept(w: World, r: BookingRequest, acceptedBy: 'ARTIST' | 'BUYER', amount: Minor) {
  r.status = 'ACCEPTED';
  r.offer = amount;
  const bookingId = newId('bkg');
  const contractId = newId('con');
  const artist = artistRef(w, r.artistId);
  const escrowId = openEscrow(w, { subject: { kind: 'BOOKING', id: bookingId }, payer: r.buyer, payee: artist, amount, trigger: 'BOOKING_COMPLETED', funded: false });
  w.bookings.unshift({ id: bookingId, requestId: r.id, artistId: r.artistId, buyer: r.buyer, eventName: r.eventName, date: r.date, location: r.location, fee: amount, status: 'AWAITING_SIGNATURES', contractId, escrowId });
  w.contracts.unshift({
    id: contractId,
    subject: { kind: 'BOOKING', id: bookingId },
    title: `Performance agreement: ${r.eventName}`,
    terms: [
      `${r.durationHours}-hour performance on ${new Date(r.date).toLocaleDateString('en-KE', { dateStyle: 'medium' })}`,
      `Venue: ${r.location}`,
      `Fee: ${formatKES(amount)}, paid into Selah escrow before the event`,
      'Funds released to the artist after the performance is marked complete',
      'Cancellation within 48 hours of the event forfeits 50% of the fee',
    ],
    status: 'SENT',
    // Whoever accepted signs as part of accepting.
    signedBy: [acceptedBy === 'ARTIST' ? artist : r.buyer],
    createdAt: nowISO(),
  });
  r.bookingId = bookingId;
  w.availability.push({ artistId: r.artistId, date: r.date, status: 'TENTATIVE', bookingId, note: r.eventName });
  return { bookingId, contractId };
}

export function requestBooking(args: { artistId: ArtistId; buyer: PartyRef; eventName: string; date: ISODate; location: string; durationHours: number; offer: Minor; message: string }): BookingRequestId {
  const id = newId('brq');
  commit((s) => {
    const w = s.world;
    w.bookingRequests.unshift({ ...args, id, status: 'PENDING', counterOffers: [], createdAt: nowISO() });
    notify(w, artistRef(w, args.artistId), 'BOOKING_REQUESTED', 'New booking request', `${partyName(w, args.buyer)} wants you for ${args.eventName}.`, `/artist/gigs/${id}`);
  });
  // Simulated artist: accept at or above their minimum, otherwise counter at the minimum.
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const r = byId(w.bookingRequests, id);
    const artist = findArtist(w, r?.artistId);
    if (!r || !artist || r.status !== 'PENDING') return;
    const floor = minPrice(artist.pricing.booking);
    if (r.offer >= floor) {
      accept(w, r, 'ARTIST', r.offer);
      notify(w, r.buyer, 'BOOKING_ACCEPTED', `${artist.stageName} accepted!`, 'Sign the contract and pay into escrow to lock in the date.', buyerHref(r));
    } else {
      r.status = 'NEGOTIATING';
      r.counterOffers.push({ by: 'ARTIST', amount: floor, note: `Thanks for the offer! My minimum for this is ${formatKES(floor)}. Happy to make it work at that.`, at: nowISO() });
      notify(w, r.buyer, 'BOOKING_REQUESTED', `${artist.stageName} sent a counter-offer`, `They proposed ${formatKES(floor)}.`, buyerHref(r));
    }
  });
  return id;
}

/** Either side accepts the latest terms. The other side is simulated. */
export function acceptRequest(requestId: BookingRequestId, by: 'ARTIST' | 'BUYER') {
  let contractId: ContractId | undefined;
  commit((s) => {
    const w = s.world;
    const r = byId(w.bookingRequests, requestId);
    if (!r || (r.status !== 'PENDING' && r.status !== 'NEGOTIATING')) return;
    const last = r.counterOffers[r.counterOffers.length - 1];
    contractId = accept(w, r, by, last?.amount ?? r.offer).contractId;
    const artist = findArtist(w, r.artistId)!;
    if (by === 'ARTIST') notify(w, r.buyer, 'BOOKING_ACCEPTED', `${artist.stageName} accepted your booking`, 'The contract is ready to sign.', buyerHref(r));
    else notify(w, artistRef(w, r.artistId), 'BOOKING_ACCEPTED', 'Counter-offer accepted', `${partyName(w, r.buyer)} accepted your terms for ${r.eventName}.`, `/artist/gigs/${r.id}`);
  });
  // The simulated other side countersigns; a simulated buyer also pays into escrow.
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const c = byId(w.contracts, contractId);
    if (!c || c.subject.kind !== 'BOOKING') return;
    const b = byId(w.bookings, c.subject.id)!;
    const other = by === 'ARTIST' ? b.buyer : artistRef(w, b.artistId);
    if (!c.signedBy.some((p) => samePartyRef(p, other))) c.signedBy.push(other);
    if (c.signedBy.length >= 2 && b.status === 'AWAITING_SIGNATURES') {
      c.status = 'SIGNED';
      b.status = 'CONTRACT_SIGNED';
    }
    if (by === 'ARTIST' && b.status === 'CONTRACT_SIGNED') {
      fundEscrow(w, b.escrowId, 'MPESA', `Booking: ${b.eventName}`);
      b.status = 'SCHEDULED';
      c.status = 'ACTIVE';
      const slot = w.availability.find((a) => a.bookingId === b.id);
      if (slot) slot.status = 'BOOKED';
    } else if (by === 'BUYER') {
      notify(w, b.buyer, 'BOOKING_ACCEPTED', 'Contract countersigned', 'Pay into escrow to confirm the booking.', buyerHref(byId(w.bookingRequests, b.requestId)!));
    }
  });
  return contractId;
}

export function declineRequest(requestId: BookingRequestId, by: 'ARTIST' | 'BUYER') {
  commit((s) => {
    const r = byId(s.world.bookingRequests, requestId);
    if (!r) return;
    r.status = by === 'ARTIST' ? 'DECLINED' : 'CANCELLED';
    const to = by === 'ARTIST' ? r.buyer : artistRef(s.world, r.artistId);
    notify(s.world, to, 'BOOKING_REQUESTED', by === 'ARTIST' ? 'Booking declined' : 'Booking request cancelled', r.eventName);
  });
}

export function counterOffer(requestId: BookingRequestId, by: 'ARTIST' | 'BUYER', amount: Minor, note: string) {
  commit((s) => {
    const r = byId(s.world.bookingRequests, requestId);
    if (!r) return;
    r.status = 'NEGOTIATING';
    r.counterOffers.push({ by, amount, note, at: nowISO() });
  });
  // The other side accepts the counter after a moment.
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const r = byId(w.bookingRequests, requestId);
    if (!r || r.status !== 'NEGOTIATING') return;
    const last = r.counterOffers[r.counterOffers.length - 1];
    if (last?.by !== by) return;
    const other = by === 'ARTIST' ? 'BUYER' : 'ARTIST';
    accept(w, r, other, last.amount);
    if (by === 'BUYER') notify(w, r.buyer, 'BOOKING_ACCEPTED', `${findArtist(w, r.artistId)!.stageName} accepted your counter-offer`, 'The contract is ready to sign.', buyerHref(r));
    else notify(w, artistRef(w, r.artistId), 'BOOKING_ACCEPTED', 'Your counter-offer was accepted', `${partyName(w, r.buyer)} signed at ${formatKES(last.amount)}.`, `/artist/gigs/${r.id}`);
  });
}

/** Sign. When the artist signs a buyer-pending contract, the simulated buyer signs and pays next. */
export function signContract(contractId: ContractId, party: PartyRef) {
  commit((s) => {
    const w = s.world;
    const c = byId(w.contracts, contractId);
    if (!c || c.subject.kind !== 'BOOKING') return;
    if (!c.signedBy.some((p) => samePartyRef(p, party))) c.signedBy.push(party);
    const b = byId(w.bookings, c.subject.id)!;
    if (c.signedBy.length >= 2) {
      c.status = 'SIGNED';
      b.status = 'CONTRACT_SIGNED';
    }
  });
  later(DELAY.quick + 1500, (s) => {
    const w = s.world;
    const c = byId(w.contracts, contractId);
    if (!c || c.subject.kind !== 'BOOKING') return;
    const b = byId(w.bookings, c.subject.id)!;
    const artist = artistRef(w, b.artistId);
    // Counterparty signs if still missing.
    for (const p of [b.buyer, artist]) if (!c.signedBy.some((x) => samePartyRef(x, p))) c.signedBy.push(p);
    c.status = 'SIGNED';
    if (b.status === 'AWAITING_SIGNATURES') b.status = 'CONTRACT_SIGNED';
    // If the tester is the artist, the simulated buyer also pays.
    if (samePartyRef(party, artist) && b.status === 'CONTRACT_SIGNED') {
      fundEscrow(w, b.escrowId, 'MPESA', `Booking: ${b.eventName}`);
      b.status = 'SCHEDULED';
      c.status = 'ACTIVE';
      const slot = w.availability.find((a) => a.bookingId === b.id);
      if (slot) slot.status = 'BOOKED';
    }
  });
}

export function payBooking(bookingId: BookingId, method: PaymentMethod) {
  commit((s) => {
    const w = s.world;
    const b = byId(w.bookings, bookingId);
    if (!b || b.status !== 'CONTRACT_SIGNED') return;
    fundEscrow(w, b.escrowId, method, `Booking: ${findArtist(w, b.artistId)!.stageName}`);
    b.status = 'SCHEDULED';
    const c = byId(w.contracts, b.contractId);
    if (c) c.status = 'ACTIVE';
    const slot = w.availability.find((a) => a.bookingId === b.id);
    if (slot) slot.status = 'BOOKED';
    notify(w, artistRef(w, b.artistId), 'PAYMENT_HELD', 'Booking confirmed and paid', `${formatKES(b.fee)} for ${b.eventName} is held in escrow.`, `/artist/gigs/${b.requestId}`);
  });
}

/** "The night happened." Fulfilment, then release after the (compressed) hold. */
export function completeBooking(bookingId: BookingId) {
  commit((s) => {
    const b = byId(s.world.bookings, bookingId);
    if (!b || b.status !== 'SCHEDULED') return;
    b.status = 'COMPLETED';
    markFulfilled(s.world, b.escrowId);
  });
  later(DELAY.counterparty, (s) => {
    const w = s.world;
    const b = byId(w.bookings, bookingId);
    if (!b || b.status !== 'COMPLETED') return;
    b.status = 'PAID';
    releaseEscrow(w, b.escrowId, b.eventName);
    const c = byId(w.contracts, b.contractId);
    if (c) c.status = 'COMPLETED';
    const artist = findArtist(w, b.artistId);
    if (artist) artist.gigsPlayed += 1;
  });
}
