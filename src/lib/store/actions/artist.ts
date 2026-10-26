'use client';

import type { ArtistCapability, AvailabilityStatus, ContentType, PaymentMethod } from '@/lib/constants/enums';
import { formatKES, newId, nowISO } from '@/lib/format';
import { byId, findArtist, personRef } from '@/lib/selectors';
import type { ArtistId, ArtistProfile, BusinessId, ContentId, EventId, ISODate, Minor, PayoutAccount, PersonId, PitchId, PriceOrRange, PromoId } from '@/types';
import { commit, later } from '../store';
import { DELAY, debit, notify, record } from './util';

export type NewArtistInput = Pick<
  ArtistProfile,
  'stageName' | 'sellerType' | 'sellerBusiness' | 'category' | 'bio' | 'genres' | 'languages' | 'location' | 'travelRadiusKm' | 'pricing' | 'payout' | 'media'
> & { idVerified: boolean; creatorServices: boolean };

/** Adds the Artist role to a Person (Part 4.1). Creator services finish their own setup later. */
export function becomeArtist(personId: PersonId, input: NewArtistInput): ArtistId {
  const id = `art_${personId.slice(4)}` as ArtistId;
  commit((s) => {
    const p = byId(s.world.people, personId);
    if (!p || p.artist) return;
    const { idVerified, creatorServices, ...profile } = input;
    if (idVerified) p.verification = 'ID_VERIFIED';
    const capabilities: ArtistCapability[] = ['SELL_ARTIST_SERVICES'];
    if (creatorServices) capabilities.push('SELL_CREATOR_SERVICES');
    p.artist = { id, personId, capabilities, ...profile, verification: idVerified ? 'ID_VERIFIED' : 'PHONE_VERIFIED', rating: 5, gigsPlayed: 0 };
    notify(s.world, personRef(personId), 'VERIFICATION_PASSED', 'You’re live on Selah', 'Your artist profile is now in the directory. Bookings will land in Gigs & requests.', '/artist');
  });
  return id;
}

export function updatePricing(artistId: ArtistId, pricing: { booking: PriceOrRange; songRequest: Minor; shoutOut: Minor }) {
  commit((s) => {
    const a = findArtist(s.world, artistId);
    if (a) a.pricing = pricing;
  });
}

export function updateArtistProfile(artistId: ArtistId, patch: Partial<Pick<ArtistProfile, 'stageName' | 'bio' | 'genres' | 'languages' | 'travelRadiusKm' | 'payout'>>) {
  commit((s) => {
    const a = findArtist(s.world, artistId);
    if (a) Object.assign(a, patch);
  });
}

export function setPayout(artistId: ArtistId, payout: PayoutAccount) {
  updateArtistProfile(artistId, { payout });
}

/** Facade "VERIFIED_ARTIST" badge review: auto-approved after an animated check. */
export function requestVerifiedBadge(artistId: ArtistId) {
  later(DELAY.counterparty, (s) => {
    const a = findArtist(s.world, artistId);
    if (!a) return;
    a.verification = 'VERIFIED_ARTIST';
    notify(s.world, personRef(a.personId), 'VERIFICATION_PASSED', 'Verified Artist badge unlocked', 'You now appear first in search and get faster payouts.', '/artist');
  });
}

// ---------- Store ----------
export function addContent(artistId: ArtistId, item: { type: ContentType; title: string; description: string; price: Minor }): ContentId {
  const id = newId('cnt');
  commit((s) => {
    s.world.content.unshift({ id, artistId, ...item, sales: 0, cover: `g${s.world.content.length % 8}` });
  });
  return id;
}

export function updateContentPrice(id: ContentId, price: Minor) {
  commit((s) => {
    const c = byId(s.world.content, id);
    if (c) c.price = price;
  });
}

export function removeContent(id: ContentId) {
  commit((s) => {
    s.world.content = s.world.content.filter((c) => c.id !== id);
  });
}

// ---------- Calendar ----------
export function setAvailability(artistId: ArtistId, date: ISODate, status: Exclude<AvailabilityStatus, 'BOOKED'> | null, note?: string) {
  const day = date.slice(0, 10);
  commit((s) => {
    s.world.availability = s.world.availability.filter((b) => !(b.artistId === artistId && b.date.slice(0, 10) === day && !b.bookingId));
    if (status && status !== 'AVAILABLE') s.world.availability.push({ artistId, date, status, note });
  });
}

// ---------- Proposals (7.2: SENT → VIEWED → ACCEPTED / DECLINED / WITHDRAWN) ----------
export function sendPitch(artistId: ArtistId, to: BusinessId, fee: Minor, message: string, eventId?: EventId): PitchId {
  const id = newId('pit');
  commit((s) => {
    s.world.pitches.unshift({ id, artistId, to, eventId, fee, message, status: 'SENT', createdAt: nowISO() });
    notify(s.world, { kind: 'BUSINESS', id: to }, 'BOOKING_REQUESTED', 'New artist proposal', `${findArtist(s.world, artistId)?.stageName} pitched you a set.`, '/biz/bookings');
  });
  later(DELAY.counterparty, (s) => {
    const p = byId(s.world.pitches, id);
    if (p?.status === 'SENT') p.status = 'VIEWED';
  });
  // Simulated venue: accepts reasonable pitches and sends a booking request at the pitched fee.
  later(DELAY.slow, (s) => {
    const w = s.world;
    const p = byId(w.pitches, id);
    const artist = findArtist(w, artistId);
    if (!p || p.status !== 'VIEWED' || !artist) return;
    const venue = byId(w.businesses, to);
    if (p.fee > 100000 * 100) {
      p.status = 'DECLINED';
      notify(w, personRef(artist.personId), 'BOOKING_REQUESTED', 'Proposal declined', `${venue?.name} passed on this one.`, '/artist/pitches');
      return;
    }
    p.status = 'ACCEPTED';
    const ev = byId(w.events, eventId);
    const brqId = newId('brq');
    w.bookingRequests.unshift({
      id: brqId,
      artistId,
      buyer: { kind: 'BUSINESS', id: to },
      eventName: ev?.title ?? `${venue?.name} guest set`,
      date: ev?.date ?? new Date(Date.now() + 10 * 86400_000).toISOString(),
      location: venue?.address ?? 'Nairobi',
      durationHours: 4,
      offer: p.fee,
      message: `We loved your proposal. Booking you at your pitched fee of ${formatKES(p.fee)}.`,
      status: 'PENDING',
      counterOffers: [],
      createdAt: nowISO(),
    });
    notify(w, personRef(artist.personId), 'BOOKING_REQUESTED', `${venue?.name} accepted your proposal!`, 'They’ve sent a booking request. Confirm it to lock the date.', `/artist/gigs/${brqId}`);
  });
  return id;
}

export function withdrawPitch(id: PitchId) {
  commit((s) => {
    const p = byId(s.world.pitches, id);
    if (p && (p.status === 'SENT' || p.status === 'VIEWED')) p.status = 'WITHDRAWN';
  });
}

// ---------- Promo (artist as buyer) ----------
export function createPromo(artistId: ArtistId, args: { title: string; contentId?: ContentId; budget: Minor; days: number; method: PaymentMethod }): PromoId {
  const id = newId('prm');
  commit((s) => {
    const w = s.world;
    const a = findArtist(w, artistId)!;
    const payer = personRef(a.personId);
    if (args.method === 'WALLET') debit(w, payer, args.budget);
    record(w, { party: payer, amount: args.budget, direction: 'OUT', description: `Promo: ${args.title}`, method: args.method, status: 'RELEASED', ref: { kind: 'TOPUP' } });
    w.promos.unshift({ id, artistId, contentId: args.contentId, title: args.title, budget: args.budget, days: args.days, impressions: 0, clicks: 0, status: 'ACTIVE', createdAt: nowISO() });
  });
  // Results trickle in.
  [1, 2, 3].forEach((step) =>
    later(DELAY.counterparty * step, (s) => {
      const p = byId(s.world.promos, id);
      if (!p) return;
      const full = Math.round((p.budget / 100) * 4.2);
      p.impressions = Math.round((full * step) / 3);
      p.clicks = Math.round(p.impressions * 0.037);
      if (step === 3) p.status = 'COMPLETED';
    }),
  );
  return id;
}
