import { EARN_PROGRAMME, type EarnProgramme, type EscrowState } from '@/lib/constants/enums';
import { BADGE_GIGS, artists, businessRef, currentPolicy, displayLabel, personRef, samePartyRef, tierIsStale, type BusinessLabel } from '@/lib/selectors';
import type { ArtistProfile, BusinessAccount, Dispute, EarnEntry, Escrow, EscrowSubject, Flag, Minor, PartyRef, PayoutAccount, Person, World } from '@/types';

// Read-only views over the whole world for the Admin console (Phase 8).

const sum = (xs: Minor[]) => xs.reduce((a, b) => a + b, 0) as Minor;

/** Funded money in escrow, whatever happened next. */
const FUNDED: readonly EscrowState[] = ['FUNDS_HELD', 'FULFILLED', 'RELEASED', 'DISPUTED'];
/** Money Selah is still sitting on. */
const HELD: readonly EscrowState[] = ['FUNDS_HELD', 'FULFILLED', 'DISPUTED'];

const platformFee = (e: Escrow) => sum(e.splits.filter((s) => s.to === 'PLATFORM').map((s) => s.amount));

export function kpis(w: World) {
  const p = currentPolicy(w);
  const sellerBalances = sellers(w).map((x) => x.balance).filter((b) => b >= p.minPayoutThreshold);
  const revenue = sum(w.escrows.filter((e) => e.state === 'RELEASED').map(platformFee));
  const rewards = sum(w.earn.filter((e) => e.rewardStatus === 'PAID').map((e) => e.reward));
  return {
    gmv: sum(w.escrows.filter((e) => FUNDED.includes(e.state)).map((e) => e.amount)),
    held: sum(w.escrows.filter((e) => HELD.includes(e.state)).map((e) => e.amount)),
    heldCount: w.escrows.filter((e) => HELD.includes(e.state)).length,
    revenue,
    rewards,
    netRevenue: (revenue - rewards) as Minor,
    payoutsDue: sum(sellerBalances),
    payoutsDueCount: sellerBalances.length,
  };
}

// ---------- Payouts ----------
export interface Seller {
  party: PartyRef;
  name: string;
  balance: Minor;
  account: PayoutAccount;
}

/** Everyone with a payout account set up, whatever they sell. */
export function sellers(w: World): Seller[] {
  const out: Seller[] = [];
  for (const x of w.people) {
    const account = x.artist?.payout ?? x.prefs?.payout;
    if (account && !x.isAdmin) out.push({ party: personRef(x.id), name: x.artist?.stageName ?? x.name, balance: x.wallet.balance, account });
  }
  for (const b of w.businesses) if (b.payout) out.push({ party: businessRef(b.id), name: b.name, balance: b.wallet.balance, account: b.payout });
  return out;
}

const SCHEDULE_DAYS = { WEEKLY: 7, MONTHLY: 30 } as const;

export const pendingPayouts = (w: World) => w.payouts.filter((p) => p.status === 'PENDING');

export type DueSeller = Seller & { lastPaidAt?: string };

/** Sellers on a weekly or monthly schedule, over the minimum, whose last payout is at least one interval old. */
export function scheduledDue(w: World): DueSeller[] {
  const min = currentPolicy(w).minPayoutThreshold;
  const pending = pendingPayouts(w);
  const out: DueSeller[] = [];
  for (const s of sellers(w)) {
    const { schedule } = s.account;
    if (schedule === 'ON_DEMAND' || s.balance < min || pending.some((p) => samePartyRef(p.party, s.party))) continue;
    const lastPaidAt = w.payouts.find((p) => p.status === 'RELEASED' && samePartyRef(p.party, s.party))?.at;
    if (!lastPaidAt || Date.now() - new Date(lastPaidAt).getTime() >= SCHEDULE_DAYS[schedule] * 86400_000) out.push({ ...s, lastPaidAt });
  }
  return out;
}

// ---------- Platform balances ----------
/**
 * What Selah is holding, split into money that belongs to users (wallets, escrow, payouts in transit)
 * and Selah's own (fees on released escrows, less rewards paid). Together they're what the bank should show.
 */
export function platformBalances(w: World) {
  const k = kpis(w);
  const heldIn = (state: EscrowState) => sum(w.escrows.filter((e) => e.state === state).map((e) => e.amount));
  const people = sum(w.people.filter((p) => !p.isAdmin).map((p) => p.wallet.balance));
  const businesses = sum(w.businesses.map((b) => b.wallet.balance));
  const inTransit = sum(pendingPayouts(w).map((p) => p.amount));
  const escrow = { FUNDS_HELD: heldIn('FUNDS_HELD'), FULFILLED: heldIn('FULFILLED'), DISPUTED: heldIn('DISPUTED') };
  const userFunds = sum([people, businesses, inTransit, escrow.FUNDS_HELD, escrow.FULFILLED, escrow.DISPUTED]);
  return {
    wallets: { people, businesses },
    escrow,
    inTransit,
    userFunds,
    fees: k.revenue,
    rewards: k.rewards,
    own: k.netRevenue,
    total: (userFunds + k.netRevenue) as Minor,
    /** Approved Earn rewards Selah has committed to but not yet credited. */
    rewardsOwed: sum(w.earn.filter((e) => e.rewardStatus === 'APPROVED').map((e) => e.reward)),
    /** Selah's cut of escrow still held: earned only on release. */
    feesPending: sum(w.escrows.filter((e) => HELD.includes(e.state)).map(platformFee)),
  };
}

/** Wallets holding the most user money, people and businesses together. */
export function largestWallets(w: World, n = 10): { party: PartyRef; balance: Minor }[] {
  return [
    ...w.people.filter((p) => !p.isAdmin).map((p) => ({ party: personRef(p.id), balance: p.wallet.balance })),
    ...w.businesses.map((b) => ({ party: businessRef(b.id), balance: b.wallet.balance })),
  ]
    .filter((x) => x.balance > 0)
    .sort((a, b) => b.balance - a.balance)
    .slice(0, n);
}

export type RoleBucket = 'PATRON' | 'ARTIST' | 'CREATOR' | BusinessLabel;

export function usersByRole(w: World): Record<RoleBucket, number> {
  const out: Record<RoleBucket, number> = { PATRON: 0, ARTIST: 0, CREATOR: 0, VENUE: 0, ORGANISER: 0, BRAND: 0, BUSINESS: 0 };
  for (const p of w.people) {
    if (p.isAdmin) continue;
    out.PATRON++;
    if (p.artist?.capabilities.includes('SELL_ARTIST_SERVICES')) out.ARTIST++;
    if (p.artist?.capabilities.includes('SELL_CREATOR_SERVICES')) out.CREATOR++;
  }
  for (const b of w.businesses) out[displayLabel(b)]++;
  return out;
}

// ---------- Queues ----------
/** Sellers who never cleared the automated ID check: manual-review fallback. */
export const idQueue = (w: World): Person[] => w.people.filter((p) => !p.isAdmin && p.artist && p.verification === 'PHONE_VERIFIED');
export const badgeQueue = (w: World): ArtistProfile[] => artists(w).filter((a) => a.verification === 'ID_VERIFIED' && a.gigsPlayed >= BADGE_GIGS);
export const businessQueue = (w: World): BusinessAccount[] => w.businesses.filter((b) => !b.verified);
export const activeDisputes = (w: World): Dispute[] => w.disputes.filter((d) => d.status === 'OPEN' || d.status === 'UNDER_REVIEW' || d.status === 'ESCALATED');
export const openFlags = (w: World): Flag[] => w.flags.filter((f) => f.status === 'OPEN');
export const earnQueue = (w: World): EarnEntry[] => w.earn.filter((e) => e.rewardStatus === 'PENDING' || e.rewardStatus === 'APPROVED');
export const staleCreators = (w: World): ArtistProfile[] => {
  const p = currentPolicy(w);
  return artists(w).filter((a) => a.creator && tierIsStale(a.creator, p));
};

export function queueCounts(w: World) {
  return {
    verification: idQueue(w).length + badgeQueue(w).length + businessQueue(w).length,
    disputes: activeDisputes(w).length,
    flags: openFlags(w).length,
    earn: earnQueue(w).length,
    creators: staleCreators(w).length,
    payouts: pendingPayouts(w).length + scheduledDue(w).length,
  };
}

// ---------- Revenue reports ----------
export type Period = 'WEEK' | 'MONTH';

export interface PeriodRow {
  key: string;
  label: string;
  start: Date;
  gmv: Minor;
  revenue: Minor;
  /** Earn rewards paid out of Selah's own pocket. */
  rewards: Minor;
  /** Revenue less rewards. */
  net: Minor;
  refunds: Minor;
  payouts: Minor;
  signups: number;
}

/** Rewards count as a cost when paid: the wallet credit's date, falling back to submission. */
const rewardPaidAt = (w: World, e: EarnEntry) => w.transactions.find((t) => t.ref.kind === 'REWARD' && t.ref.id === e.id)?.at ?? e.createdAt;

/** When a platform fee counts as earned: on release, falling back to when it was paid in. */
const releasedAt = (e: Escrow) => e.releaseAt ?? e.heldAt;

function periodStarts(period: Period, count: number): Date[] {
  const now = new Date();
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const back = count - 1 - i;
    if (period === 'MONTH') return new Date(d.getFullYear(), d.getMonth() - back, 1);
    // Weeks start on Monday.
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7) - back * 7);
    return d;
  });
}

/** Platform totals bucketed by week or month, oldest first. */
export function periodReport(w: World, period: Period, count = period === 'WEEK' ? 8 : 6): PeriodRow[] {
  const starts = periodStarts(period, count);
  const rows: PeriodRow[] = starts.map((start) => ({
    key: start.toISOString(),
    label: period === 'MONTH' ? start.toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }) : `w/c ${start.toLocaleDateString('en-KE', { day: 'numeric', month: 'short' })}`,
    start,
    gmv: 0 as Minor,
    revenue: 0 as Minor,
    rewards: 0 as Minor,
    net: 0 as Minor,
    refunds: 0 as Minor,
    payouts: 0 as Minor,
    signups: 0,
  }));
  const bucket = (iso: string | undefined) => {
    if (!iso) return undefined;
    const t = new Date(iso).getTime();
    for (let i = rows.length - 1; i >= 0; i--) if (t >= rows[i].start.getTime()) return t <= Date.now() ? rows[i] : undefined;
    return undefined;
  };
  const add = (row: PeriodRow | undefined, k: 'gmv' | 'revenue' | 'rewards' | 'refunds' | 'payouts', m: Minor) => {
    if (row) row[k] = (row[k] + m) as Minor;
  };
  for (const e of w.escrows) {
    if (FUNDED.includes(e.state)) add(bucket(e.heldAt), 'gmv', e.amount);
    if (e.state === 'RELEASED') add(bucket(releasedAt(e)), 'revenue', platformFee(e));
    if (e.state === 'REFUNDED') add(bucket(e.heldAt), 'refunds', e.amount);
  }
  for (const p of w.payouts) if (p.status === 'RELEASED') add(bucket(p.settledAt ?? p.at), 'payouts', p.amount);
  for (const e of w.earn) if (e.rewardStatus === 'PAID') add(bucket(rewardPaidAt(w, e)), 'rewards', e.reward);
  for (const r of rows) r.net = (r.revenue - r.rewards) as Minor;
  for (const x of [...w.people.filter((p) => !p.isAdmin), ...w.businesses]) {
    const row = bucket(x.createdAt);
    if (row) row.signups++;
  }
  return rows;
}

export interface StreamRow {
  kind: EscrowSubject['kind'];
  count: number;
  gmv: Minor;
  revenue: Minor;
  refunds: Minor;
}

/** All-time totals per revenue stream (orders, bookings, creator jobs, screen ads). */
export function streamReport(w: World): StreamRow[] {
  const kinds: EscrowSubject['kind'][] = ['ORDER', 'BOOKING', 'JOB', 'AD_CAMPAIGN'];
  return kinds.map((kind) => {
    const es = w.escrows.filter((e) => e.subject.kind === kind);
    return {
      kind,
      count: es.filter((e) => FUNDED.includes(e.state)).length,
      gmv: sum(es.filter((e) => FUNDED.includes(e.state)).map((e) => e.amount)),
      revenue: sum(es.filter((e) => e.state === 'RELEASED').map(platformFee)),
      refunds: sum(es.filter((e) => e.state === 'REFUNDED').map((e) => e.amount)),
    };
  });
}

export interface RewardRow {
  programme: EarnProgramme;
  paidCount: number;
  paid: Minor;
  /** Approved but not yet in the member's wallet. */
  owed: Minor;
  /** Still in review; may never be paid. */
  pending: Minor;
}

/** What each Earn programme has cost Selah, all time. */
export function rewardReport(w: World): RewardRow[] {
  return EARN_PROGRAMME.map((programme) => {
    const es = w.earn.filter((e) => e.programme === programme);
    const total = (status: EarnEntry['rewardStatus']) => sum(es.filter((e) => e.rewardStatus === status).map((e) => e.reward));
    return { programme, paidCount: es.filter((e) => e.rewardStatus === 'PAID').length, paid: total('PAID'), owed: total('APPROVED'), pending: total('PENDING') };
  });
}
