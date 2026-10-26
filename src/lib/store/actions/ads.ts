'use client';

import type { PaymentMethod } from '@/lib/constants/enums';
import { formatKES, newId, nowISO } from '@/lib/format';
import { businessRef, byId, currentPolicy } from '@/lib/selectors';
import type { AdCampaign, AdCampaignId, BusinessAccount, BusinessId, EscrowId, InventoryId, ISODate, Minor, World } from '@/types';
import { commit, later } from '../store';
import { charge, markFulfilled, openEscrow, releaseEscrow } from './money';
import { DELAY, notify, record } from './util';

// BUY_AD_INVENTORY (6.3): slots → dates → creative → pay into escrow per venue → run → AD_RUN_COMPLETED → release.

export type AdPayMethod = PaymentMethod | 'INVOICE';

export const runDays = (start: ISODate, end: ISODate) => Math.max(1, Math.ceil((new Date(end).getTime() - new Date(start).getTime()) / 86400_000));

/** Slot prices are per night of the run. */
export function quoteAdCampaign(w: World, slotIds: InventoryId[], start: ISODate, end: ISODate) {
  const days = runDays(start, end);
  const slots = w.inventory.flatMap((i) => (i.type === 'AD_SLOT' && slotIds.includes(i.id) ? [i] : []));
  const byVenue = new Map<BusinessId, Minor>();
  for (const s of slots) byVenue.set(s.venueId, ((byVenue.get(s.venueId) ?? 0) + s.price * days) as Minor);
  const total = slots.reduce((a, s) => a + s.price * days, 0) as Minor;
  const reach = slots.reduce((a, s) => a + s.reachEstimate * days, 0);
  return { days, slots, byVenue, total, reach };
}

/** Policy guard: large ad spend needs a verified business. */
export function adSpendError(w: World, brand: BusinessAccount, total: Minor): string | null {
  const limit = currentPolicy(w).adSpendVerifyThreshold;
  return total > limit && !brand.verified ? `Campaigns over ${formatKES(limit)} need a verified business. Verify in Business settings.` : null;
}

export function createAdCampaign(
  brandId: BusinessId,
  args: { name: string; slotIds: InventoryId[]; startDate: ISODate; endDate: ISODate; creative: AdCampaign['creative']; method: AdPayMethod },
): AdCampaignId {
  const id = newId('adc');
  commit((s) => {
    const w = s.world;
    const brand = businessRef(brandId);
    const { byVenue, total } = quoteAdCampaign(w, args.slotIds, args.startDate, args.endDate);
    const subject = { kind: 'AD_CAMPAIGN', id } as const;
    const invoiceNo = args.method === 'INVOICE' ? `INV-${new Date().getFullYear()}-${id.slice(-4).toUpperCase()}` : undefined;
    const escrowIds: EscrowId[] = [...byVenue].map(([venueId, amount]) =>
      openEscrow(w, { subject, payer: brand, payee: businessRef(venueId), amount, trigger: 'AD_RUN_COMPLETED', funded: true, feeType: 'AD_BROKER_SHARE' }),
    );
    // Invoiced brands are on credit terms: Selah fronts the escrow and bills net 30.
    if (args.method === 'INVOICE') record(w, { party: brand, amount: total, direction: 'OUT', description: `Ad campaign: ${args.name} (invoice ${invoiceNo})`, status: 'HELD', ref: subject });
    else charge(w, brand, total, args.method, `Ad campaign: ${args.name}`, subject);
    w.adCampaigns.unshift({ id, brandId, name: args.name, slotIds: args.slotIds, startDate: args.startDate, endDate: args.endDate, budget: total, creative: args.creative, impressions: 0, plays: 0, spend: 0 as Minor, status: 'SCHEDULED', escrowIds, invoiceNo, createdAt: nowISO() });
    for (const slot of w.inventory) if (slot.type === 'AD_SLOT' && args.slotIds.includes(slot.id)) slot.status = 'BOOKED';
    const brandName = byId(w.businesses, brandId)?.name;
    for (const venueId of byVenue.keys()) notify(w, businessRef(venueId), 'PAYMENT_HELD', 'Ad slots booked', `${brandName} booked your screens for “${args.name}”. Payment is held until the run completes.`, '/biz/ad-slots');
  });
  simulateRun(id);
  return id;
}

/** The facade compresses the run: it goes live, numbers tick up, then it completes and venues are paid. */
function simulateRun(id: AdCampaignId) {
  const STEPS = 3;
  later(DELAY.counterparty, (s) => {
    const c = byId(s.world.adCampaigns, id);
    if (c?.status === 'SCHEDULED') c.status = 'RUNNING';
  });
  for (let step = 1; step <= STEPS; step++) {
    later(DELAY.counterparty * (step + 1), (s) => {
      const w = s.world;
      const c = byId(w.adCampaigns, id);
      if (!c || c.status !== 'RUNNING') return;
      const { reach, days, slots } = quoteAdCampaign(w, c.slotIds, c.startDate, c.endDate);
      c.impressions = Math.round((reach * step) / STEPS);
      c.plays = Math.round((slots.reduce((a, sl) => a + (3600 / sl.slotLengthSec) * 0.1, 0) * days * step) / STEPS);
      c.spend = Math.round((c.budget * step) / STEPS) as Minor;
      if (step < STEPS) return;
      c.status = 'COMPLETED';
      for (const eid of c.escrowIds) {
        markFulfilled(w, eid);
        releaseEscrow(w, eid, `Ad run: ${c.name}`);
      }
      for (const slot of w.inventory) if (slot.type === 'AD_SLOT' && c.slotIds.includes(slot.id)) slot.status = 'AVAILABLE';
      notify(w, businessRef(c.brandId), 'PAYMENT_RELEASED', 'Ad campaign completed', `“${c.name}” reached ${c.impressions.toLocaleString('en-KE')} people over ${c.plays} plays.`, `/biz/ads/campaigns/${c.id}`);
    });
  }
}
