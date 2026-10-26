import type { BusinessCapability, Capability, CommissionType, CreatorTier, Preset } from '@/lib/constants/enums';
import { CREATOR_TIER } from '@/lib/constants/enums';
import {
  BUSINESS_BASE_PANELS,
  BUSINESS_TAIL_PANELS,
  PANEL,
  PANELS_BY_CAPABILITY,
  PERSON_BASE_PANELS,
  SELL_SIDE_CAPABILITIES,
  type PanelId,
} from '@/lib/constants/panels';
import { policyAt, type PolicyVersion } from '@/lib/constants/policy';
import { bps, subMinor } from '@/lib/format';
import type {
  ArtistId,
  ArtistProfile,
  BusinessAccount,
  BusinessId,
  CreatorProfile,
  Escrow,
  FlagTarget,
  Job,
  JobId,
  Minor,
  PartyRef,
  Person,
  PersonId,
  Session,
  Split,
  World,
} from '@/types';

export function byId<T extends { id: string }>(list: T[], id: string | undefined): T | undefined {
  return id ? list.find((x) => x.id === id) : undefined;
}

export const samePartyRef = (a: PartyRef, b: PartyRef) => a.kind === b.kind && a.id === b.id;
export const personRef = (id: PersonId): PartyRef => ({ kind: 'PERSON', id });
export const businessRef = (id: BusinessId): PartyRef => ({ kind: 'BUSINESS', id });

export const artists = (w: World): ArtistProfile[] => w.people.flatMap((p) => (p.artist ? [p.artist] : []));
export const findArtist = (w: World, id: ArtistId | undefined) => artists(w).find((a) => a.id === id);
export const artistOwner = (w: World, a: ArtistProfile) => byId(w.people, a.personId)!;

export const jobContract = (w: World, jobId: JobId) => w.contracts.find((c) => c.subject.kind === 'JOB' && c.subject.id === jobId);
/** A job agreement the creator still has to sign blocks work on the job. Seeded jobs without a contract are treated as signed. */
export const jobNeedsSignature = (w: World, jobId: JobId) => jobContract(w, jobId)?.status === 'SENT';
export const isPendingInvite = (j: Job) => j.source === 'DIRECT_INVITE' && !j.inviteAccepted && j.status === 'ASSIGNED';
/** The creator's move: sign, submit, revise, or post. */
export const jobAwaitsCreator = (w: World, j: Job) =>
  !isPendingInvite(j) &&
  (jobNeedsSignature(w, j.id) || j.status === 'ASSIGNED' || j.status === 'REVISION_REQUESTED' || (j.jobType === 'INFLUENCE' && j.status === 'APPROVED'));

/** Completed gigs an ID-verified artist needs before the Verified Artist badge. */
export const BADGE_GIGS = 3;

export const isArtistSeller = (a?: ArtistProfile) => !!a?.capabilities.includes('SELL_ARTIST_SERVICES');
export const isCreator = (a?: ArtistProfile) => !!a?.capabilities.includes('SELL_CREATOR_SERVICES');

export function partyName(w: World, ref: PartyRef): string {
  if (ref.kind === 'BUSINESS') return byId(w.businesses, ref.id)?.name ?? 'Unknown business';
  const p = byId(w.people, ref.id);
  return p?.artist?.stageName ?? p?.name ?? 'Unknown';
}

// ---------- Reported content ----------
const FLAG_KIND_LABEL: Record<FlagTarget['kind'], string> = { ARTIST: 'Artist profile', BUSINESS: 'Business page', EVENT: 'Event', CONTENT: 'Store item' };
export const flagKindLabel = (t: FlagTarget) => FLAG_KIND_LABEL[t.kind];

export function flagTargetName(w: World, t: FlagTarget): string {
  if (t.kind === 'ARTIST') return findArtist(w, t.id)?.stageName ?? 'Removed artist';
  if (t.kind === 'BUSINESS') return byId(w.businesses, t.id)?.name ?? 'Removed business';
  if (t.kind === 'EVENT') return byId(w.events, t.id)?.title ?? 'Removed event';
  return byId(w.content, t.id)?.title ?? 'Removed item';
}

/** Where the reported thing lives in the patron-facing app. */
export function flagTargetHref(w: World, t: FlagTarget): string {
  if (t.kind === 'ARTIST') return `/artists/${t.id}`;
  if (t.kind === 'BUSINESS') return `/venues/${t.id}`;
  if (t.kind === 'EVENT') return `/events/${t.id}`;
  const c = byId(w.content, t.id);
  return c ? `/artists/${c.artistId}` : '/discover';
}

/** Who answers for the reported thing. */
export function flagTargetOwner(w: World, t: FlagTarget): PartyRef | undefined {
  if (t.kind === 'BUSINESS') return byId(w.businesses, t.id) && businessRef(t.id);
  if (t.kind === 'EVENT') {
    const e = byId(w.events, t.id);
    return e && businessRef(e.venueId);
  }
  const a = findArtist(w, t.kind === 'ARTIST' ? t.id : byId(w.content, t.id)?.artistId);
  return a && personRef(a.personId);
}

export type BusinessLabel = Extract<Preset, 'VENUE' | 'ORGANISER' | 'BRAND'> | 'BUSINESS';

/** Highest-order capability wins for labelling (Part 1.4): Venue > Organiser > Brand. */
export function displayLabel(b: Pick<BusinessAccount, 'capabilities' | 'venueType'>): BusinessLabel {
  const c = b.capabilities;
  // A venue sells inventory from a physical venue; selling tickets without one is an organiser.
  if (c.includes('SELL_VENUE_INVENTORY') && b.venueType) return 'VENUE';
  if (c.includes('BUY_ARTIST_BOOKINGS') || c.includes('SELL_VENUE_INVENTORY')) return 'ORGANISER';
  if (c.includes('BUY_AD_INVENTORY') || c.includes('COMMISSION_CREATOR_JOBS')) return 'BRAND';
  return 'BUSINESS';
}

export const BUSINESS_LABEL_TEXT: Record<BusinessLabel, string> = {
  VENUE: 'Venue',
  ORGANISER: 'Organiser',
  BRAND: 'Brand',
  BUSINESS: 'Business',
};

export function personLabel(p: Person): string {
  if (p.isAdmin) return 'Admin';
  if (!p.artist) return 'Patron';
  if (isArtistSeller(p.artist) && isCreator(p.artist)) return 'Artist · Creator';
  return isArtistSeller(p.artist) ? 'Artist' : 'Creator';
}

/** Capabilities in force for whoever the session is acting as. */
export function activeCapabilities(w: World, s: Session): Capability[] {
  if (s.actingAs.kind === 'BUSINESS') return byId(w.businesses, s.actingAs.id)?.capabilities ?? [];
  return byId(w.people, s.personId)?.artist?.capabilities ?? [];
}

export function getPanels(w: World, s: Session): PanelId[] {
  const caps = activeCapabilities(w, s);
  const base: readonly PanelId[] = s.actingAs.kind === 'BUSINESS' ? BUSINESS_BASE_PANELS : PERSON_BASE_PANELS;
  const tail: readonly PanelId[] = s.actingAs.kind === 'BUSINESS' ? BUSINESS_TAIL_PANELS : [];
  return [...new Set<PanelId>([...base, ...caps.flatMap((c) => PANELS_BY_CAPABILITY[c]), ...tail])];
}

/** The capability a /biz screen belongs to (longest matching panel href), or null for base screens. */
export function capabilityForPath(path: string): BusinessCapability | null {
  let best: { cap: BusinessCapability; len: number } | null = null;
  for (const [cap, panels] of Object.entries(PANELS_BY_CAPABILITY) as [Capability, readonly PanelId[]][]) {
    for (const id of panels) {
      const href: string = PANEL[id].href;
      if ((path === href || path.startsWith(href + '/')) && href.length > (best?.len ?? 0)) best = { cap: cap as BusinessCapability, len: href.length };
    }
  }
  return best?.cap ?? null;
}

export const hasSellSide = (caps: readonly Capability[]) => caps.some((c) => SELL_SIDE_CAPABILITIES.includes(c));

/** Guardrail 3, in one place: sell-side needs verification + payout; buy-side needs billing. */
export function readiness(b: BusinessAccount): { ready: boolean; missing: string[] } {
  const missing: string[] = [];
  if (hasSellSide(b.capabilities)) {
    if (!b.verified) missing.push('Business verification');
    if (!b.payout) missing.push('Payout account');
  } else if (b.capabilities.length && !b.billing) {
    missing.push('Billing account');
  }
  return { ready: missing.length === 0, missing };
}

export function currentPolicy(w: World): PolicyVersion {
  return policyAt(w.policy);
}

export function tierFor(followers: number, p: PolicyVersion): CreatorTier | null {
  let tier: CreatorTier | null = null;
  for (const t of CREATOR_TIER) if (followers >= p.tierThresholds[t]) tier = t;
  return tier;
}

/** Due for a follower recheck (TIER_RECHECK_INTERVAL). */
export const tierIsStale = (c: CreatorProfile, p: PolicyVersion) => Date.now() - new Date(c.tierLastVerifiedAt).getTime() >= p.tierRecheckDays * 86400_000;

export type FeeType = Extract<CommissionType, 'PLATFORM_FEE' | 'AD_BROKER_SHARE'>;

/** Split engine (6.4): platform fee (or the ad broker cut on screen ads) off the top, remainder to the seller. */
export function computeSplits(amount: Minor, payee: PartyRef, p: PolicyVersion, feeBps?: number, feeType: FeeType = 'PLATFORM_FEE'): Split[] {
  const fee = bps(amount, feeBps ?? p.commissionBps[feeType]);
  const shareType = payee.kind === 'BUSINESS' ? 'VENUE_SHARE' : 'ARTIST_SHARE';
  return [
    { type: feeType, to: 'PLATFORM', amount: fee, policyVersion: p.version },
    { type: shareType, to: payee, amount: subMinor(amount, fee), policyVersion: p.version },
  ];
}

/** Preview splits under the policy in force now, before any escrow exists. */
export const quoteSplits = (w: World, amount: Minor, payee: PartyRef, opts: { feeBps?: number; feeType?: FeeType } = {}): Split[] =>
  computeSplits(amount, payee, currentPolicy(w), opts.feeBps, opts.feeType);

export const payeeShare = (e: Escrow): Minor =>
  e.splits.filter((s) => s.to !== 'PLATFORM').reduce((a, s) => a + s.amount, 0) as Minor;

export function walletOf(w: World, ref: PartyRef): Minor {
  return (ref.kind === 'PERSON' ? byId(w.people, ref.id)?.wallet.balance : byId(w.businesses, ref.id)?.wallet.balance) ?? (0 as Minor);
}

export function heldFor(w: World, ref: PartyRef): Minor {
  return w.escrows
    .filter((e) => samePartyRef(e.payee, ref) && (e.state === 'FUNDS_HELD' || e.state === 'FULFILLED'))
    .reduce((a, e) => a + payeeShare(e), 0) as Minor;
}

export const unreadCount = (w: World, ref: PartyRef) => w.notifications.filter((n) => !n.read && samePartyRef(n.to, ref)).length;
