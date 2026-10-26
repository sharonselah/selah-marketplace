'use client';

import type { BusinessCapability, Preset, VenueType } from '@/lib/constants/enums';
import { kes, newId, nowISO } from '@/lib/format';
import { businessRef, byId } from '@/lib/selectors';
import type { BillingAccount, BusinessAccount, BusinessId, PayoutAccount, PersonId } from '@/types';
import { commit } from '../store';
import { notify } from './util';

// Business Accounts (Part 4.2): one object, capabilities as flags. Venue / Organiser / Brand are derived labels.

export interface NewBusinessInput {
  name: string;
  regTaxId: string;
  address: string;
  contactName: string;
  contactPhone: string;
  venueType?: VenueType;
  preset: Preset;
  capabilities: BusinessCapability[];
  /** Sell-side: docs checked in the wizard. */
  verified: boolean;
  payout?: PayoutAccount;
  billing?: BillingAccount;
}

/** Creates the business, links it to its owner and switches the session to act as it. */
export function createBusiness(ownerId: PersonId, input: NewBusinessInput): BusinessId {
  const id = newId('biz');
  commit((s) => {
    const owner = byId(s.world.people, ownerId);
    if (!owner) return;
    const business: BusinessAccount = { id, ownerId, ...input, wallet: { balance: kes(0) }, createdAt: nowISO() };
    s.world.businesses.push(business);
    owner.businessIds.push(id);
    if (s.session?.personId === ownerId) s.session.actingAs = businessRef(id);
    notify(s.world, businessRef(id), 'ACCOUNT_CREATED', `${input.name} is live on Selah`, 'Your dashboard is built from the capabilities you picked. Change them any time in Business settings.', '/biz');
  });
  return id;
}

export function updateBusiness(id: BusinessId, patch: Partial<Pick<BusinessAccount, 'name' | 'address' | 'contactName' | 'contactPhone' | 'venueType' | 'regTaxId'>>) {
  commit((s) => {
    const b = byId(s.world.businesses, id);
    if (b) Object.assign(b, patch);
  });
}

/** Adding or removing a capability only changes flags; the dashboard recomposes from them. Data is never deleted. */
export function setCapabilities(id: BusinessId, capabilities: BusinessCapability[]) {
  commit((s) => {
    const b = byId(s.world.businesses, id);
    if (!b) return;
    b.capabilities = capabilities;
    b.preset = 'CUSTOM';
  });
}

export function setBusinessPayout(id: BusinessId, payout: PayoutAccount) {
  commit((s) => {
    const b = byId(s.world.businesses, id);
    if (b) b.payout = payout;
  });
}

export function setBilling(id: BusinessId, billing: BillingAccount) {
  commit((s) => {
    const b = byId(s.world.businesses, id);
    if (b) b.billing = billing;
  });
}

/** Called once the facade document review animation finishes. */
export function verifyBusiness(id: BusinessId) {
  commit((s) => {
    const b = byId(s.world.businesses, id);
    if (!b || b.verified) return;
    b.verified = true;
    notify(s.world, businessRef(id), 'VERIFICATION_PASSED', 'Business verified', `${b.name} can now sell on Selah.`, '/biz/settings');
  });
}
