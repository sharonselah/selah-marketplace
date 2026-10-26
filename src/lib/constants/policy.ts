import type { CommissionType, CreatorTier } from './enums';
import type { ISODate, Minor } from '@/types';

// Policy lives in config (Part 8.2): admin-editable, versioned, effective-dated.
// Seeded here; the store keeps the editable copy so Admin can add versions.

export interface PolicyVersion {
  version: string;
  effectiveFrom: ISODate;
  note: string;
  /** Basis points: 1000 = 10%. */
  commissionBps: Record<CommissionType, number>;
  creatorJobFeeBps: number;
  escrowHoldHours: number;
  referralReward: Minor;
  artistRecruitmentReward: Minor;
  modelProgrammeReward: Minor;
  lyricReward: Minor;
  minPayoutThreshold: Minor;
  /** Withdrawals above this wait in the admin payout queue; smaller ones go straight out. */
  payoutReviewAbove: Minor;
  verificationRequiredAbove: Minor;
  adSpendVerifyThreshold: Minor;
  bookingRequestExpiryHours: number;
  maxActiveLiveSessions: number;
  /** Minimum follower count for each tier. */
  tierThresholds: Record<CreatorTier, number>;
  tierRecheckDays: number;
}

const m = (shillings: number) => (shillings * 100) as Minor;

export const SEED_POLICY: PolicyVersion[] = [
  {
    version: 'v1.0',
    effectiveFrom: '2026-01-01T00:00:00.000Z',
    note: 'Launch rates',
    commissionBps: { PLATFORM_FEE: 1000, VENUE_SHARE: 9000, ARTIST_SHARE: 9000, AD_BROKER_SHARE: 2000, REFERRAL_REWARD: 0 },
    creatorJobFeeBps: 1200,
    escrowHoldHours: 72,
    referralReward: m(200),
    artistRecruitmentReward: m(1000),
    modelProgrammeReward: m(500),
    lyricReward: m(150),
    minPayoutThreshold: m(1000),
    payoutReviewAbove: m(50000),
    verificationRequiredAbove: m(50000),
    adSpendVerifyThreshold: m(100000),
    bookingRequestExpiryHours: 48,
    maxActiveLiveSessions: 1,
    tierThresholds: { NANO: 250, MICRO: 5000, MACRO: 30000, META: 100000, MEGA: 500000 },
    tierRecheckDays: 30,
  },
  {
    version: 'v1.1',
    effectiveFrom: '2026-07-01T00:00:00.000Z',
    note: 'Lower platform fee, shorter escrow hold',
    commissionBps: { PLATFORM_FEE: 800, VENUE_SHARE: 9200, ARTIST_SHARE: 9200, AD_BROKER_SHARE: 1800, REFERRAL_REWARD: 0 },
    creatorJobFeeBps: 1000,
    escrowHoldHours: 48,
    referralReward: m(250),
    artistRecruitmentReward: m(1500),
    modelProgrammeReward: m(500),
    lyricReward: m(150),
    minPayoutThreshold: m(500),
    payoutReviewAbove: m(50000),
    verificationRequiredAbove: m(50000),
    adSpendVerifyThreshold: m(100000),
    bookingRequestExpiryHours: 48,
    maxActiveLiveSessions: 1,
    tierThresholds: { NANO: 250, MICRO: 5000, MACRO: 30000, META: 100000, MEGA: 500000 },
    tierRecheckDays: 30,
  },
];

/** The version in force at `at` (latest effectiveFrom ≤ at). */
export function policyAt(versions: PolicyVersion[], at: ISODate = new Date().toISOString()): PolicyVersion {
  const sorted = [...versions].sort((a, b) => b.effectiveFrom.localeCompare(a.effectiveFrom));
  return sorted.find((v) => v.effectiveFrom <= at) ?? sorted[sorted.length - 1];
}
