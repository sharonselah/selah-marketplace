'use client';

import type { PaymentMethod } from '@/lib/constants/enums';
import { formatKES, newId, nowISO } from '@/lib/format';
import { byId, partyName } from '@/lib/selectors';
import type { ContentId, EscrowId, EventId, InventoryId, Minor, Order, OrderId, PartyRef, World } from '@/types';
import { commit, getState, later } from '../store';
import { charge, markFulfilled, openEscrow, refundEscrow, releaseEscrow } from './money';
import { DELAY, credit, notify, record } from './util';

export interface CartLine {
  itemId: InventoryId | ContentId;
  qty: number;
}

/** Resolve cart lines to priced order lines + the seller. Content is sold by the artist (a Person). */
interface PricedLine {
  itemId: InventoryId | ContentId;
  name: string;
  qty: number;
  unit: Minor;
  seller: PartyRef;
  eventId?: EventId;
  isContent: boolean;
}

export function priceCart(w: World, lines: CartLine[]) {
  const priced = lines.flatMap((l): PricedLine[] => {
    const inv = w.inventory.find((i) => i.id === l.itemId);
    if (inv) return [{ itemId: inv.id, name: inv.name, qty: l.qty, unit: inv.price, seller: { kind: 'BUSINESS', id: inv.venueId }, eventId: inv.type === 'TICKET' ? inv.eventId : undefined, isContent: false }];
    const c = w.content.find((x) => x.id === l.itemId);
    if (!c) return [];
    const owner = w.people.find((p) => p.artist?.id === c.artistId)!;
    return [{ itemId: c.id, name: c.title, qty: l.qty, unit: c.price, seller: { kind: 'PERSON', id: owner.id }, isContent: true }];
  });
  const total = priced.reduce((a, l) => a + l.unit * l.qty, 0) as Minor;
  return { lines: priced, total, seller: priced[0]?.seller, eventId: priced.find((l) => l.eventId)?.eventId, isContent: priced.length > 0 && priced.every((l) => l.isContent) };
}

/** First purchase activates a pending referral and pays the referrer. */
function activateReferral(w: World, buyer: PartyRef) {
  if (buyer.kind !== 'PERSON') return;
  const entry = w.earn.find((e) => e.programme === 'REFERRAL' && e.inviteeId === buyer.id && !e.activated);
  if (!entry || entry.programme !== 'REFERRAL') return;
  entry.activated = true;
  entry.rewardStatus = 'PAID';
  const ref: PartyRef = { kind: 'PERSON', id: entry.personId };
  credit(w, ref, entry.reward);
  record(w, { party: ref, amount: entry.reward, direction: 'IN', description: `Referral reward: ${entry.inviteeName}`, status: 'RELEASED', ref: { kind: 'REWARD', id: entry.id } });
  notify(w, ref, 'REWARD_EARNED', 'Referral reward earned', `${entry.inviteeName} made their first purchase. ${formatKES(entry.reward)} added to your wallet.`, '/earn');
}

export function placeOrder(buyer: PartyRef, cart: CartLine[], method: PaymentMethod): OrderId {
  const id = newId('ord');
  const cartInfo = priceCart(getState().world, cart);
  commit((s) => {
    const w = s.world;
    const { lines, total, seller, eventId, isContent } = priceCart(w, cart);
    const subject = { kind: 'ORDER', id } as const;
    const escrowId = openEscrow(w, { subject, payer: buyer, payee: seller!, amount: total, trigger: isContent ? 'CONTENT_DELIVERED' : lines.some((l) => l.name.toLowerCase().includes('table')) ? 'TABLE_REDEEMED' : 'TICKET_SCANNED', funded: true });
    charge(w, buyer, total, method, `Order: ${lines[0].name}${lines.length > 1 ? ` +${lines.length - 1}` : ''}`, subject);
    const order: Order = {
      id,
      buyer,
      seller: seller!,
      eventId,
      lines: lines.map(({ itemId, name, qty, unit }) => ({ itemId, name, qty, unit })),
      total,
      status: isContent ? 'FULFILLED' : 'PAID',
      paymentMethod: method,
      qrCode: isContent ? undefined : `SELAH-${id.slice(4).toUpperCase()}`,
      escrowId,
      createdAt: nowISO(),
    };
    w.orders.unshift(order);
    for (const l of lines) {
      const inv = w.inventory.find((i) => i.id === l.itemId);
      if (inv?.type === 'TICKET') inv.sold = Math.min(inv.capacity, inv.sold + l.qty);
      if (inv?.type === 'TABLE') inv.available = Math.max(0, inv.available - l.qty);
      const c = w.content.find((x) => x.id === l.itemId);
      if (c) c.sales += l.qty;
    }
    notify(w, buyer, 'TICKET_PURCHASED', isContent ? 'Purchase complete' : 'Order confirmed', isContent ? `${lines[0].name} is ready to download.` : `Show your QR code at the door. ${formatKES(total)} is held safely until check-in.`, `/orders/${id}`);
    notify(w, seller!, 'TICKET_PURCHASED', 'New order', `${partyName(w, buyer)} bought ${lines.map((l) => `${l.qty}× ${l.name}`).join(', ')}.`, seller!.kind === 'BUSINESS' ? '/biz/check-in' : '/artist/store');
    if (isContent) markFulfilled(w, escrowId);
    activateReferral(w, buyer);
  });
  // Content is delivered instantly; the seller is paid after the (compressed) hold.
  if (cartInfo.isContent) {
    later(DELAY.counterparty, (s) => {
      const o = byId(s.world.orders, id);
      if (!o) return;
      o.status = 'COMPLETED';
      releaseEscrow(s.world, o.escrowId, o.lines[0].name);
    });
  }
  return id;
}

/** Venue scans the QR (or the buyer taps "simulate check-in"). */
export function checkInOrder(orderId: OrderId) {
  commit((s) => {
    const o = byId(s.world.orders, orderId);
    if (!o || o.status !== 'PAID') return;
    o.status = 'FULFILLED';
    markFulfilled(s.world, o.escrowId);
    notify(s.world, o.buyer, 'TICKET_PURCHASED', 'Checked in. Enjoy!', `You’re in at ${partyName(s.world, o.seller)}.`, `/orders/${o.id}`);
  });
  later(DELAY.counterparty, (s) => {
    const o = byId(s.world.orders, orderId);
    if (!o || o.status !== 'FULFILLED') return;
    o.status = 'COMPLETED';
    releaseEscrow(s.world, o.escrowId, `Order ${o.lines[0].name}`);
  });
}

// ---------- Disputes ----------
export function raiseDispute(escrowId: EscrowId, raisedBy: PartyRef, reason: string, details: string) {
  const id = newId('dsp');
  commit((s) => {
    const w = s.world;
    const e = byId(w.escrows, escrowId);
    if (!e) return;
    e.state = 'DISPUTED';
    w.disputes.unshift({ id, escrowId, raisedBy, reason, details, status: 'OPEN', createdAt: nowISO() });
    if (e.subject.kind === 'ORDER') {
      const o = byId(w.orders, e.subject.id);
      if (o) o.status = 'DISPUTED';
    }
    if (e.subject.kind === 'BOOKING') {
      const b = byId(w.bookings, e.subject.id);
      if (b) b.status = 'DISPUTED';
    }
    notify(w, raisedBy, 'PAYMENT_HELD', 'Dispute opened', 'Funds are frozen while our team reviews. We usually respond within 24 hours.', `/disputes/${id}`);
  });
  // Simulated support team: review, then resolve in the buyer's favour.
  later(DELAY.counterparty, (s) => {
    const d = byId(s.world.disputes, id);
    if (d?.status === 'OPEN') d.status = 'UNDER_REVIEW';
  });
  later(DELAY.slow, (s) => {
    const d = byId(s.world.disputes, id);
    if (!d || d.status !== 'UNDER_REVIEW') return;
    d.status = 'RESOLVED_BUYER';
    const e = byId(s.world.escrows, d.escrowId)!;
    refundEscrow(s.world, e.id, d.reason);
    if (e.subject.kind === 'ORDER') {
      const o = byId(s.world.orders, e.subject.id);
      if (o) o.status = 'REFUNDED';
    }
    if (e.subject.kind === 'BOOKING') {
      const b = byId(s.world.bookings, e.subject.id);
      if (b) b.status = 'CANCELLED';
    }
  });
  return id;
}

export const ticketsForEvent = (w: World, eventId: EventId) => w.inventory.filter((i) => i.type === 'TICKET' && i.eventId === eventId);
