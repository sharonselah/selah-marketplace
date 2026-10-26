import { ARTIST_CATEGORY, CREATOR_TIER } from '@/lib/constants/enums';
import { SEED_POLICY } from '@/lib/constants/policy';
import { kes } from '@/lib/format';
import { tierFor } from '@/lib/selectors';
import type {
  ArtistProfile,
  BusinessAccount,
  BusinessId,
  Escrow,
  EscrowId,
  EscrowSubject,
  ISODate,
  Minor,
  PartyRef,
  Person,
  PersonId,
} from '@/types';
import { computeSplits } from '@/lib/selectors';
import { AREAS, CREATOR_NICHES, FIRST_NAMES, GENRES, LANGUAGES, LAST_NAMES, STAGE_PREFIXES, STAGE_WORDS } from './pools';
import type { EscrowState, FulfillmentTrigger } from '@/lib/constants/enums';

// Deterministic helpers: no Math.random in seed data.
export const pick = <T>(arr: readonly T[], i: number): T => arr[((i % arr.length) + arr.length) % arr.length];
export const pickN = <T>(arr: readonly T[], i: number, n: number): T[] => Array.from({ length: n }, (_, k) => pick(arr, i + k * 3));
export const times = <T>(n: number, fn: (i: number) => T): T[] => Array.from({ length: n }, (_, i) => fn(i));

/** Today + n days, at the given hour (local). Negative n = past. */
export function dayOffset(n: number, hour = 21, minute = 0): ISODate {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}
export const hoursAgo = (h: number): ISODate => new Date(Date.now() - h * 3600_000).toISOString();

const policy = SEED_POLICY[SEED_POLICY.length - 1];

export function makePerson(i: number, o: Partial<Person> & { id: PersonId }): Person {
  const first = pick(FIRST_NAMES, i);
  const last = pick(LAST_NAMES, i + 3);
  return {
    name: `${first} ${last}`,
    location: `${pick(AREAS, i)}, Nairobi`,
    phone: `+254 7${String(10 + (i % 89)).padStart(2, '0')} ${String(100 + i * 7).slice(-3)} ${String(200 + i * 13).slice(-3)}`,
    email: `${first.toLowerCase()}.${last.toLowerCase()}@example.co.ke`,
    createdAt: dayOffset(-120 + i, 10),
    verification: 'PHONE_VERIFIED',
    wallet: { balance: kes(500 + (i % 7) * 750) },
    businessIds: [],
    referralCode: `SLH${100 + i}`,
    ...o,
  };
}

export function makeArtist(i: number, personId: PersonId, o: Partial<ArtistProfile> = {}): ArtistProfile {
  const category = pick(ARTIST_CATEGORY.slice(0, 7), i);
  const prefix = category === 'DJ' ? 'DJ' : category === 'MC_HOST' ? 'MC' : pick(STAGE_PREFIXES, i);
  const base = 8000 + (i % 6) * 6000;
  return {
    id: `art_${personId.slice(4)}`,
    personId,
    stageName: `${prefix ? prefix + ' ' : ''}${pick(STAGE_WORDS, i)}`.trim(),
    capabilities: ['SELL_ARTIST_SERVICES'],
    sellerType: 'INDIVIDUAL',
    category,
    bio: `${pick(GENRES, i)} specialist bringing the energy to ${pick(AREAS, i + 2)} and beyond. ${3 + (i % 8)} years on the decks and the mic.`,
    genres: pickN(GENRES, i, 3),
    languages: pickN(LANGUAGES, i, 2),
    media: [
      { kind: 'MIX', title: `${pick(GENRES, i)} Mix Vol. ${1 + (i % 4)}`, url: '#' },
      { kind: 'PHOTO', title: 'Live at the club', url: '#' },
      { kind: 'REEL', title: 'Crowd moments', url: '#' },
    ],
    location: `${pick(AREAS, i)}, Nairobi`,
    travelRadiusKm: [20, 50, 100, 300][i % 4],
    pricing: {
      booking: i % 3 === 0 ? { kind: 'RANGE', min: kes(base), max: kes(base * 2) } : { kind: 'FIXED', amount: kes(base) },
      songRequest: kes(100 + (i % 4) * 50),
      shoutOut: kes(200 + (i % 3) * 100),
    },
    payout: { method: 'MPESA', account: '+254 7•• ••• 123', schedule: 'WEEKLY', verified: true },
    verification: i % 3 === 0 ? 'VERIFIED_ARTIST' : i % 3 === 1 ? 'ID_VERIFIED' : 'PHONE_VERIFIED',
    rating: 4 + ((i * 7) % 10) / 10,
    gigsPlayed: 5 + i * 4,
    ...o,
  };
}

export function makeCreator(i: number, followers: number): NonNullable<ArtistProfile['creator']> {
  return {
    niche: pickN(CREATOR_NICHES, i, 2),
    rateCard: [
      { deliverable: 'Instagram reel', price: kes(3000 + i * 500) },
      { deliverable: 'TikTok video', price: kes(2500 + i * 400) },
      { deliverable: 'Story set (3)', price: kes(1500 + i * 200) },
    ],
    socials: [
      { platform: 'INSTAGRAM', handle: `@creator_${i}`, followers: Math.round(followers * 0.6) },
      { platform: 'TIKTOK', handle: `@creator.${i}`, followers: Math.round(followers * 0.4) },
    ],
    tier: tierFor(followers, policy) ?? CREATOR_TIER[0],
    followerCount: followers,
    tierLastVerifiedAt: dayOffset(-(i % 20), 9),
  };
}

export function makeBusiness(o: Partial<BusinessAccount> & Pick<BusinessAccount, 'id' | 'ownerId' | 'name' | 'capabilities' | 'preset'>): BusinessAccount {
  return {
    regTaxId: `PVT-${o.id.slice(4, 8).toUpperCase()}2024`,
    address: 'Westlands, Nairobi',
    contactName: 'Manager',
    contactPhone: '+254 720 000 000',
    verified: true,
    payout: { method: 'BANK', account: '•••• 4821', bankName: 'Equity Bank', schedule: 'WEEKLY', verified: true },
    billing: { mode: 'PREPAID_WALLET', email: 'accounts@example.co.ke' },
    wallet: { balance: kes(50000) },
    createdAt: dayOffset(-200, 10),
    ...o,
  };
}

/** Builds an escrow with policy splits. Push the result into world.escrows. */
export function makeEscrow(
  id: EscrowId,
  subject: EscrowSubject,
  payer: PartyRef,
  payee: PartyRef,
  amount: Minor,
  state: EscrowState,
  trigger: FulfillmentTrigger,
  heldAt: ISODate = hoursAgo(48),
): Escrow {
  const releaseAt = new Date(new Date(heldAt).getTime() + policy.escrowHoldHours * 3600_000).toISOString();
  return {
    id,
    subject,
    payer,
    payee,
    amount,
    state,
    trigger,
    heldAt: state === 'AWAITING_FUNDS' ? undefined : heldAt,
    releaseAt: state === 'AWAITING_FUNDS' ? undefined : releaseAt,
    splits: computeSplits(amount, payee, policy, undefined, trigger === 'AD_RUN_COMPLETED' ? 'AD_BROKER_SHARE' : 'PLATFORM_FEE'),
  };
}

export const bizRef = (id: BusinessId): PartyRef => ({ kind: 'BUSINESS', id });
export const perRef = (id: PersonId): PartyRef => ({ kind: 'PERSON', id });
