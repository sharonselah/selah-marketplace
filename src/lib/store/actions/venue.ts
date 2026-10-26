'use client';

import type { AdSlotStatus, EventStatus, TicketTier } from '@/lib/constants/enums';
import { formatKES, newId } from '@/lib/format';
import { businessRef, byId, findArtist, personRef } from '@/lib/selectors';
import type { SelahEvent, ArtistId, BusinessId, EventId, InventoryId, InventoryItem, ISODate, Minor, Order, OrderId, PitchId } from '@/types';
import { commit } from '../store';
import { requestBooking } from './bookings';
import { refundEscrow } from './money';
import { notify } from './util';

// SELL_VENUE_INVENTORY: inventory, events (7.5: DRAFT → PUBLISHED → SOLD_OUT / COMPLETED / CANCELLED), check-in, ad slots.

// ---------- Inventory ----------
export type InventoryDraft =
  | { type: 'TABLE'; name: string; price: Minor; capacity: number; perks: string[]; available: number }
  | { type: 'DRINK_PREORDER'; name: string; price: Minor; description: string }
  | { type: 'TICKET'; name: string; price: Minor; eventId: EventId; tier: TicketTier; capacity: number }
  | { type: 'AD_SLOT'; name: string; price: Minor; screen: string; reachEstimate: number; slotLengthSec: number };

export function saveInventory(venueId: BusinessId, draft: InventoryDraft, id?: InventoryId): InventoryId {
  const itemId = id ?? newId('inv');
  commit((s) => {
    const w = s.world;
    const existing = byId(w.inventory, itemId);
    if (existing) {
      // Keep the live counters (sold, booked status) when editing.
      const keep = existing.type === 'TICKET' ? { sold: existing.sold } : existing.type === 'AD_SLOT' ? { status: existing.status } : {};
      Object.assign(existing, draft, keep);
      return;
    }
    const base = { id: itemId, venueId };
    const item: InventoryItem =
      draft.type === 'TICKET'
        ? { ...base, ...draft, sold: 0 }
        : draft.type === 'AD_SLOT'
          ? { ...base, ...draft, status: 'AVAILABLE' }
          : { ...base, ...draft };
    w.inventory.push(item);
  });
  return itemId;
}

/** Items with sales stay (orders reference them); everything else can go. */
export function removeInventory(id: InventoryId) {
  commit((s) => {
    s.world.inventory = s.world.inventory.filter((i) => i.id !== id);
  });
}

export function setAdSlotStatus(id: InventoryId, status: Exclude<AdSlotStatus, 'BOOKED'>) {
  commit((s) => {
    const slot = byId(s.world.inventory, id);
    if (slot?.type === 'AD_SLOT' && slot.status !== 'BOOKED') slot.status = status;
  });
}

// ---------- Events ----------
export function saveEvent(venueId: BusinessId, input: Pick<SelahEvent, 'title' | 'description' | 'date' | 'genres' | 'cover'>, id?: EventId): EventId {
  const eventId = id ?? newId('evt');
  commit((s) => {
    const existing = byId(s.world.events, eventId);
    if (existing) Object.assign(existing, input);
    else s.world.events.push({ id: eventId, venueId, ...input, status: 'DRAFT', lineup: [] });
  });
  return eventId;
}

export function setLineup(eventId: EventId, lineup: ArtistId[]) {
  commit((s) => {
    const e = byId(s.world.events, eventId);
    if (e) e.lineup = lineup;
  });
}

/** Publish / sell out / complete / cancel. Cancelling refunds every paid order for the event. */
export function setEventStatus(eventId: EventId, status: Exclude<EventStatus, 'DRAFT'>) {
  commit((s) => {
    const w = s.world;
    const e = byId(w.events, eventId);
    if (!e) return;
    e.status = status;
    if (status !== 'CANCELLED') return;
    for (const o of w.orders) {
      if (o.eventId !== eventId || (o.status !== 'PAID' && o.status !== 'PLACED')) continue;
      refundEscrow(w, o.escrowId, `${e.title} cancelled`);
      o.status = 'REFUNDED';
    }
  });
}

// ---------- Check-in ----------
export function assignTable(orderId: OrderId, tableLabel: string) {
  commit((s) => {
    const o = byId(s.world.orders, orderId);
    if (!o) return;
    o.tableLabel = tableLabel.trim() || undefined;
    if (o.tableLabel) notify(s.world, o.buyer, 'TICKET_PURCHASED', 'Your table is ready', `You’re at ${o.tableLabel}. Show your QR at the door.`, `/orders/${o.id}`);
  });
}

/** What the door scanner resolves a code to. */
export function findOrderByCode(venueId: BusinessId, code: string, orders: Order[]): Order | undefined {
  const clean = code.trim().toUpperCase();
  return orders.find((o) => o.seller.kind === 'BUSINESS' && o.seller.id === venueId && (o.qrCode?.toUpperCase() === clean || o.id.toUpperCase() === clean));
}

// ---------- Proposals received (artist pitches) ----------
export function markPitchViewed(id: PitchId) {
  commit((s) => {
    const p = byId(s.world.pitches, id);
    if (p?.status === 'SENT') p.status = 'VIEWED';
  });
}

/** Accepting a pitch sends the artist a booking request at the pitched fee; the usual booking flow takes over. */
export function respondToPitch(id: PitchId, accept: boolean, booking?: { eventName: string; date: ISODate; location: string }) {
  let pitch: { artistId: ArtistId; to: BusinessId; fee: Minor } | undefined;
  commit((s) => {
    const w = s.world;
    const p = byId(w.pitches, id);
    if (!p || (p.status !== 'SENT' && p.status !== 'VIEWED')) return;
    p.status = accept ? 'ACCEPTED' : 'DECLINED';
    pitch = p;
    const artist = findArtist(w, p.artistId);
    const venue = byId(w.businesses, p.to);
    if (!accept && artist) notify(w, personRef(artist.personId), 'BOOKING_REQUESTED', 'Proposal declined', `${venue?.name} passed on this one.`, '/artist/pitches');
  });
  if (!accept || !pitch || !booking) return undefined;
  return requestBooking({
    artistId: pitch.artistId,
    buyer: businessRef(pitch.to),
    eventName: booking.eventName,
    date: booking.date,
    location: booking.location,
    durationHours: 4,
    offer: pitch.fee,
    message: `We loved your proposal. Booking you at your pitched fee of ${formatKES(pitch.fee)}.`,
  });
}
