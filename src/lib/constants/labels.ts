import type {
  AdSlotStatus,
  ArtistCategory,
  AvailabilityStatus,
  BookingRequestStatus,
  BookingStatus,
  Capability,
  CampaignStatus,
  CommissionType,
  ContentType,
  ContractStatus,
  CreatorTier,
  DisputeStatus,
  FlagStatus,
  EarnProgramme,
  EscrowState,
  EventStatus,
  InventoryType,
  JobSource,
  JobStatus,
  JobType,
  LeadStatus,
  OrderStatus,
  PaymentMethod,
  PayoutMethod,
  PayoutSchedule,
  Preset,
  ProposalStatus,
  RewardStatus,
  SellerType,
  TicketTier,
  TransactionStatus,
  VenueType,
  VerificationTier,
} from './enums';
import type { AdCampaign, CreatorProfile } from '@/types';

// Every map is a full Record, so adding an enum value fails the build until it's labelled.

export const CAPABILITY_LABEL: Record<Capability, string> = {
  SELL_ARTIST_SERVICES: 'Sell artist services',
  SELL_CREATOR_SERVICES: 'Sell creator services',
  SELL_VENUE_INVENTORY: 'Sell venue inventory',
  BUY_ARTIST_BOOKINGS: 'Book artists',
  BUY_AD_INVENTORY: 'Buy ad slots',
  COMMISSION_CREATOR_JOBS: 'Commission creator jobs',
};

export const CAPABILITY_DESCRIPTION: Record<Capability, string> = {
  SELL_ARTIST_SERVICES: 'Set rates, take bookings, sell mixes and merch, receive tips.',
  SELL_CREATOR_SERVICES: 'Accept brand jobs, submit drafts and get paid for posts and insights.',
  SELL_VENUE_INVENTORY: 'Sell tables, bottle pre-orders, tickets and screen ad slots.',
  BUY_ARTIST_BOOKINGS: 'Browse artists, send booking requests, sign contracts and pay via escrow.',
  BUY_AD_INVENTORY: 'Run ads on venue screens and broadcasts with reach estimates.',
  COMMISSION_CREATOR_JOBS: 'Create creator campaigns, invite creators and approve their work.',
};

export const PRESET_LABEL: Record<Preset, string> = {
  PATRON: 'Patron',
  ARTIST: 'Artist',
  CREATOR: 'Creator',
  VENUE: 'Venue',
  ORGANISER: 'Organiser',
  BRAND: 'Brand',
  CUSTOM: 'Custom',
};

export const SELLER_TYPE_LABEL: Record<SellerType, string> = {
  INDIVIDUAL: 'Individual',
  BUSINESS: 'Business (collective, band, agency)',
};

export const ARTIST_CATEGORY_LABEL: Record<ArtistCategory, string> = {
  DJ: 'DJ',
  MC_HOST: 'MC / Host',
  EVENT_HOST: 'Event host',
  MUSICIAN_BAND: 'Musician / Band',
  COMEDIAN: 'Comedian',
  PHOTOGRAPHER: 'Photographer',
  DANCER: 'Dancer',
  OTHER: 'Other',
};

export const VERIFICATION_LABEL: Record<VerificationTier, string> = {
  PHONE_VERIFIED: 'Phone verified',
  ID_VERIFIED: 'ID verified',
  VERIFIED_ARTIST: 'Verified artist',
};

export const CONTENT_TYPE_LABEL: Record<ContentType, string> = {
  PAID_MIX: 'Paid mix',
  SET: 'Live set',
  MERCH: 'Merch',
  OTHER: 'Other',
};

export const INVENTORY_TYPE_LABEL: Record<InventoryType, string> = {
  TABLE: 'Table',
  DRINK_PREORDER: 'Bottle pre-order',
  TICKET: 'Ticket',
  AD_SLOT: 'Ad slot',
};

export const VENUE_TYPE_LABEL: Record<VenueType, string> = {
  CLUB: 'Club',
  BAR: 'Bar',
  LOUNGE: 'Lounge',
  EVENT_SPACE: 'Event space',
  OTHER: 'Other',
};

export const TICKET_TIER_LABEL: Record<TicketTier, string> = {
  EARLY_BIRD: 'Early bird',
  REGULAR: 'Regular',
  VIP: 'VIP',
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  MPESA: 'M-Pesa',
  CARD: 'Card',
  WALLET: 'Selah wallet',
};

export const PAYOUT_METHOD_LABEL: Record<PayoutMethod, string> = {
  MPESA: 'M-Pesa',
  BANK: 'Bank transfer',
};

export const PAYOUT_SCHEDULE_LABEL: Record<PayoutSchedule, string> = {
  ON_DEMAND: 'On demand',
  WEEKLY: 'Weekly',
  MONTHLY: 'Monthly',
};

export const COMMISSION_TYPE_LABEL: Record<CommissionType, string> = {
  PLATFORM_FEE: 'Platform fee',
  VENUE_SHARE: 'Venue share',
  ARTIST_SHARE: 'Artist share',
  AD_BROKER_SHARE: 'Ad broker share',
  REFERRAL_REWARD: 'Referral reward',
};

export const EARN_PROGRAMME_LABEL: Record<EarnProgramme, string> = {
  REFERRAL: 'Refer a friend',
  ARTIST_RECRUITMENT: 'Recruit an artist',
  BECOME_A_MODEL: 'Become a model',
  LYRIC_CONTRIBUTION: 'Contribute lyrics',
};

export const CREATOR_TIER_LABEL: Record<CreatorTier, string> = {
  NANO: 'Nano · 250–5K',
  MICRO: 'Micro · 5K–30K',
  MACRO: 'Macro · 30K–100K',
  META: 'Meta · 100K–500K',
  MEGA: 'Mega · 500K+',
};

export const JOB_TYPE_LABEL: Record<JobType, string> = {
  INFLUENCE: 'Influence (post content)',
  INSIGHTS: 'Insights (survey / feedback)',
};

export const SOCIAL_PLATFORM_LABEL: Record<CreatorProfile['socials'][number]['platform'], string> = {
  INSTAGRAM: 'Instagram',
  TIKTOK: 'TikTok',
  YOUTUBE: 'YouTube',
  X: 'X (Twitter)',
};

export const JOB_STATUS_LABEL: Record<JobStatus, string> = {
  ASSIGNED: 'Assigned',
  DRAFT_SUBMITTED: 'In review',
  REVISION_REQUESTED: 'Revision requested',
  APPROVED: 'Approved',
  POSTED: 'Posted',
  CONFIRMED: 'Confirmed',
  PAID: 'Paid',
  DISPUTED: 'Disputed',
  CANCELLED: 'Cancelled',
};

export const JOB_SOURCE_LABEL: Record<JobSource, string> = {
  OPEN_PROPOSAL: 'Open campaign',
  DIRECT_INVITE: 'Direct invite',
};

// ---------- Status tones (drive <StatusPill>) ----------
export type Tone = 'neutral' | 'info' | 'warn' | 'good' | 'bad' | 'brand';

export const BOOKING_REQUEST_TONE: Record<BookingRequestStatus, Tone> = {
  PENDING: 'warn',
  ACCEPTED: 'good',
  DECLINED: 'bad',
  NEGOTIATING: 'info',
  EXPIRED: 'neutral',
  CANCELLED: 'neutral',
};

export const BOOKING_TONE: Record<BookingStatus, Tone> = {
  AWAITING_SIGNATURES: 'warn',
  CONTRACT_SIGNED: 'info',
  SCHEDULED: 'brand',
  COMPLETED: 'good',
  PAID: 'good',
  DISPUTED: 'bad',
  CANCELLED: 'neutral',
};

export const PROPOSAL_TONE: Record<ProposalStatus, Tone> = {
  SENT: 'info',
  VIEWED: 'info',
  SUBMITTED: 'warn',
  SHORTLISTED: 'brand',
  ACCEPTED: 'good',
  DECLINED: 'bad',
  REJECTED: 'bad',
  WITHDRAWN: 'neutral',
};

export const EVENT_TONE: Record<EventStatus, Tone> = {
  DRAFT: 'neutral',
  PUBLISHED: 'good',
  SOLD_OUT: 'brand',
  CANCELLED: 'bad',
  COMPLETED: 'neutral',
};

export const AD_SLOT_TONE: Record<AdSlotStatus, Tone> = {
  AVAILABLE: 'good',
  BOOKED: 'brand',
  EXPIRED: 'neutral',
};

export const AVAILABILITY_TONE: Record<AvailabilityStatus, Tone> = {
  AVAILABLE: 'good',
  BOOKED: 'brand',
  BLOCKED: 'neutral',
  TENTATIVE: 'warn',
};

export const TRANSACTION_TONE: Record<TransactionStatus, Tone> = {
  INITIATED: 'neutral',
  PENDING: 'warn',
  HELD: 'info',
  RELEASED: 'good',
  REFUNDED: 'neutral',
  FAILED: 'bad',
  DISPUTED: 'bad',
};

/** How a payout's transaction status reads to sellers and in the admin queue. */
export const payoutStatusLabel = (s: TransactionStatus) => (s === 'PENDING' ? 'In review' : s === 'RELEASED' ? 'Paid' : s === 'FAILED' ? 'Returned' : undefined);

export const ESCROW_TONE: Record<EscrowState, Tone> = {
  AWAITING_FUNDS: 'warn',
  FUNDS_HELD: 'info',
  FULFILLED: 'brand',
  RELEASED: 'good',
  REFUNDED: 'neutral',
  DISPUTED: 'bad',
};

export const ESCROW_LABEL: Record<EscrowState, string> = {
  AWAITING_FUNDS: 'Awaiting funds',
  FUNDS_HELD: 'Held in escrow',
  FULFILLED: 'Fulfilled',
  RELEASED: 'Released',
  REFUNDED: 'Refunded',
  DISPUTED: 'Disputed',
};

export const REWARD_TONE: Record<RewardStatus, Tone> = {
  PENDING: 'warn',
  APPROVED: 'info',
  PAID: 'good',
  REJECTED: 'bad',
};

export const LEAD_TONE: Record<LeadStatus, Tone> = {
  SUBMITTED: 'neutral',
  CONTACTED: 'info',
  ONBOARDED: 'brand',
  ACTIVATED: 'good',
  REJECTED: 'bad',
};

export const CONTRACT_TONE: Record<ContractStatus, Tone> = {
  DRAFT: 'neutral',
  SENT: 'warn',
  SIGNED: 'info',
  ACTIVE: 'brand',
  COMPLETED: 'good',
  CANCELLED: 'neutral',
};

export const DISPUTE_TONE: Record<DisputeStatus, Tone> = {
  OPEN: 'warn',
  UNDER_REVIEW: 'info',
  RESOLVED_BUYER: 'good',
  RESOLVED_SELLER: 'good',
  ESCALATED: 'bad',
};

export const FLAG_TONE: Record<FlagStatus, Tone> = {
  OPEN: 'warn',
  UPHELD: 'bad',
  DISMISSED: 'neutral',
};

export const FLAG_STATUS_LABEL: Record<FlagStatus, string> = {
  OPEN: 'Open',
  UPHELD: 'Upheld',
  DISMISSED: 'Dismissed',
};

export const CAMPAIGN_TONE: Record<CampaignStatus, Tone> = {
  DRAFT: 'neutral',
  OPEN: 'good',
  CLOSED: 'neutral',
  FILLED: 'brand',
  CANCELLED: 'bad',
};

export const JOB_TONE: Record<JobStatus, Tone> = {
  ASSIGNED: 'info',
  DRAFT_SUBMITTED: 'warn',
  REVISION_REQUESTED: 'warn',
  APPROVED: 'brand',
  POSTED: 'brand',
  CONFIRMED: 'good',
  PAID: 'good',
  DISPUTED: 'bad',
  CANCELLED: 'neutral',
};

export const AD_CAMPAIGN_TONE: Record<AdCampaign['status'], Tone> = {
  DRAFT: 'neutral',
  SCHEDULED: 'info',
  RUNNING: 'brand',
  COMPLETED: 'good',
};

export const ORDER_TONE: Record<OrderStatus, Tone> = {
  PLACED: 'warn',
  PAID: 'info',
  FULFILLED: 'brand',
  COMPLETED: 'good',
  REFUNDED: 'neutral',
  DISPUTED: 'bad',
};

/** Fallback for status labels: 'REVISION_REQUESTED' → 'Revision requested'. */
export function humanize(value: string): string {
  const s = value.replace(/_/g, ' ').toLowerCase();
  return s.charAt(0).toUpperCase() + s.slice(1);
}
